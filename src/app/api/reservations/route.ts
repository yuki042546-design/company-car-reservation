import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { limitsFromAppSettings, validateReservationInput } from "@/lib/reservationRules";
import { isExclusionViolation } from "@/lib/overlapCheck";
import { getAppSettings } from "@/lib/data";
import { getDefaultVehicle } from "@/lib/vehicles";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { translateReservationFields } from "@/lib/translate";
import { logReservationAction } from "@/lib/reservationLogs";
import { writeAuditLog } from "@/lib/auditLog";
import { enqueueNotification } from "@/lib/notifications/outbox";
import type { ReservationInput } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/reservations?from=ISO&to=ISO
// from/to を省略すると全予約を返す（全予約一覧用）。
// 指定すると、その範囲と重なる予約のみ返す（今日/今週の予約用）。
// ログイン機能がないため誰でも閲覧できる（社内共有カレンダーのため）。
export async function GET(request: NextRequest) {
  const dict = getDictionary(getLocale());

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase.from("reservations").select("*").order("start_time", { ascending: true });

  if (from && to) {
    query = query.lt("start_time", to).gt("end_time", from);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }

  const reservations = (data as ReservationRow[]).map(mapReservationRow);
  return NextResponse.json({ reservations });
}

// POST /api/reservations - 新規予約登録
// ログイン機能がないため、予約者は使用者名（employeeName）の自己申告のみで識別する。
// 重複判定・整備期間チェック・INSERTは create_reservation_tx RPC 内で
// アドバイザリーロックを使いアトミックに行う。
export async function POST(request: NextRequest) {
  const dict = getDictionary(getLocale());

  const supabase = getSupabaseAdmin();

  let body: ReservationInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const settings = await getAppSettings();
  const limits = limitsFromAppSettings(settings);

  const validation = validateReservationInput(body, dict, new Date(), limits);
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const vehicle = await getDefaultVehicle();
  if (!vehicle) {
    return NextResponse.json({ errors: [dict.validation.vehicleInactive] }, { status: 500 });
  }
  if (!vehicle.active) {
    return NextResponse.json({ errors: [dict.validation.vehicleInactive] }, { status: 409 });
  }

  const start = new Date(body.startTime);
  const end = new Date(body.endTime);

  try {
    const { inputLocale, destinationTranslated, purposeTranslated } = await translateReservationFields(
      body.destination,
      body.purpose
    );

    const { data, error } = await supabase
      .rpc("create_reservation_tx", {
        p_vehicle_id: vehicle.id,
        p_owner_user_id: null,
        p_created_by_user_id: null,
        p_employee_name: body.employeeName,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_destination: body.destination,
        p_purpose: body.purpose,
        p_note: body.note ?? null,
        p_input_locale: inputLocale,
        p_destination_translated: destinationTranslated,
        p_purpose_translated: purposeTranslated,
        p_idempotency_key: body.idempotencyKey ?? null,
      })
      .single();

    if (error) {
      if (isExclusionViolation(error)) {
        return NextResponse.json({ errors: [dict.validation.overlap] }, { status: 409 });
      }
      if (error.message?.includes("maintenance_conflict")) {
        return NextResponse.json({ errors: [dict.validation.maintenanceConflict] }, { status: 409 });
      }
      throw error;
    }

    const reservation = mapReservationRow(data as ReservationRow);

    await logReservationAction(supabase, "create", {
      employeeName: body.employeeName,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      destination: body.destination,
    });
    await writeAuditLog(supabase, {
      actorUserId: null,
      actorEmail: body.employeeName,
      action: "reservation_create",
      targetType: "reservation",
      targetId: reservation.id,
      afterData: reservation,
    });
    await enqueueNotification(supabase, {
      eventType: "reservation_created",
      targetUserId: null,
      targetType: "reservation",
      targetId: reservation.id,
      data: { startTime: reservation.startTime, endTime: reservation.endTime, destination: reservation.destination },
      idempotencyKey: `reservation_created:${reservation.id}`,
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ errors: [dict.apiErrors.createFailed] }, { status: 500 });
  }
}
