import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { limitsFromAppSettings, validateReservationInput } from "@/lib/reservationRules";
import { isExclusionViolation } from "@/lib/overlapCheck";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { requireApiUser, roleAtLeast } from "@/lib/auth";
import { getAppSettings } from "@/lib/data";
import { translateReservationFields } from "@/lib/translate";
import { logReservationAction } from "@/lib/reservationLogs";
import { writeAuditLog } from "@/lib/auditLog";
import { enqueueNotification } from "@/lib/notifications/outbox";
import type { ReservationInput } from "@/lib/types";

export const runtime = "nodejs";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("reservations").select("*").eq("id", params.id).maybeSingle();

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
  }

  return NextResponse.json({ reservation: mapReservationRow(data as ReservationRow) });
}

// PUT /api/reservations/[id] - 予約内容の変更
// - 本人（owner_user_id一致）は、開始前（status='reserved'）の自分の予約のみ変更できる。
// - vehicle_manager以上は、開始後の予約も「訂正」として変更できるが、reason（訂正理由）が必須。
//   訂正内容は監査ログへ変更前後を記録する。
// - owner_user_id が未割当（移行前のレガシー予約）の場合は、本人確認の手段がないため
//   vehicle_manager以上のみ編集・割当を行える。
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const currentUser = auth.user;
  const isManager = roleAtLeast(currentUser.role, "vehicle_manager");

  const supabase = getSupabaseAdmin();

  let body: ReservationInput & { correctionReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const { data: existingRow, error: fetchError } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }
  if (!existingRow) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
  }
  const existing = mapReservationRow(existingRow as ReservationRow);

  const isOwner = existing.ownerUserId !== null && existing.ownerUserId === currentUser.id;
  if (!isOwner && !isManager) {
    return NextResponse.json({ errors: [dict.apiErrors.forbidden] }, { status: 403 });
  }

  const isCorrection = existing.status !== "reserved";
  if (isCorrection && !isManager) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotEditable] }, { status: 403 });
  }
  if (isCorrection && !body.correctionReason?.trim()) {
    return NextResponse.json({ errors: [dict.apiErrors.correctionReasonRequired] }, { status: 400 });
  }

  const settings = await getAppSettings();
  const limits = limitsFromAppSettings(settings, isManager);
  const validation = validateReservationInput(body, dict, new Date(), limits);
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const start = new Date(body.startTime);
  const end = new Date(body.endTime);

  try {
    const contentUnchanged = existing.destination === body.destination && existing.purpose === body.purpose;

    const { inputLocale, destinationTranslated, purposeTranslated } = contentUnchanged
      ? {
          inputLocale: existing.inputLocale,
          destinationTranslated: existing.destinationTranslated,
          purposeTranslated: existing.purposeTranslated,
        }
      : await translateReservationFields(body.destination, body.purpose);

    const { data, error } = await supabase
      .rpc("update_reservation_tx", {
        p_reservation_id: params.id,
        p_vehicle_id: existing.vehicleId,
        p_updated_by_user_id: currentUser.id,
        p_employee_name: body.employeeName,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_destination: body.destination,
        p_purpose: body.purpose,
        p_note: body.note ?? null,
        p_input_locale: inputLocale,
        p_destination_translated: destinationTranslated,
        p_purpose_translated: purposeTranslated,
      })
      .single();

    if (error) {
      if (isExclusionViolation(error)) {
        return NextResponse.json({ errors: [dict.validation.overlap] }, { status: 409 });
      }
      if (error.message?.includes("maintenance_conflict")) {
        return NextResponse.json({ errors: [dict.validation.maintenanceConflict] }, { status: 409 });
      }
      if (error.message?.includes("not_editable")) {
        return NextResponse.json({ errors: [dict.apiErrors.reservationNotEditable] }, { status: 409 });
      }
      throw error;
    }
    if (!data) {
      return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
    }

    const updated = mapReservationRow(data as ReservationRow);

    await logReservationAction(supabase, "update", {
      employeeName: body.employeeName,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      destination: body.destination,
    });
    await writeAuditLog(supabase, {
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: isCorrection ? "reservation_correct" : "reservation_update",
      targetType: "reservation",
      targetId: updated.id,
      beforeData: existing,
      afterData: updated,
      reason: body.correctionReason ?? null,
    });
    await enqueueNotification(supabase, {
      eventType: "reservation_updated",
      targetUserId: updated.ownerUserId,
      targetType: "reservation",
      targetId: updated.id,
      data: { startTime: updated.startTime, endTime: updated.endTime, destination: updated.destination },
      idempotencyKey: `reservation_updated:${updated.id}:${updated.updatedAt}`,
    });

    return NextResponse.json({ reservation: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ errors: [dict.apiErrors.updateFailed] }, { status: 500 });
  }
}

// DELETE /api/reservations/[id] - 予約のキャンセル（物理削除ではなく status='cancelled' への更新）
// - 本人は開始前（status='reserved'）の自分の予約のみキャンセルできる。
// - vehicle_managerは誰の予約でもキャンセルできるが、reasonの入力が必須。
// - owner_user_id が未割当のレガシー予約は、旧方式のrequesterName自己申告での
//   本人確認にフォールバックする（移行期間中の互換性維持のため）。
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const currentUser = auth.user;
  const isManager = roleAtLeast(currentUser.role, "vehicle_manager");

  let body: { requesterName?: string; cancellationReason?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const supabase = getSupabaseAdmin();

  const { data: existingRow, error: fetchError } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }
  if (!existingRow) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
  }
  const existing = mapReservationRow(existingRow as ReservationRow);

  if (!isManager) {
    const isOwner = existing.ownerUserId !== null && existing.ownerUserId === currentUser.id;
    const isLegacySelfService = existing.ownerUserId === null && body.requesterName === existing.employeeName;
    if (!isOwner && !isLegacySelfService) {
      return NextResponse.json({ errors: [dict.apiErrors.notOwnerOrAdmin] }, { status: 403 });
    }
    if (existing.status !== "reserved") {
      return NextResponse.json({ errors: [dict.apiErrors.reservationNotCancellable] }, { status: 409 });
    }
  } else if (!body.cancellationReason?.trim()) {
    return NextResponse.json({ errors: [dict.apiErrors.correctionReasonRequired] }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancellation_reason: body.cancellationReason?.trim() || null,
      cancelled_at: new Date().toISOString(),
      cancelled_by_user_id: currentUser.id,
    })
    .eq("id", params.id)
    .eq("status", "reserved")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.deleteFailed] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotCancellable] }, { status: 409 });
  }

  const cancelled = mapReservationRow(data as ReservationRow);

  await logReservationAction(supabase, "delete", {
    employeeName: existing.employeeName,
    startTime: existing.startTime,
    endTime: existing.endTime,
    destination: existing.destination,
  });
  await writeAuditLog(supabase, {
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "reservation_cancel",
    targetType: "reservation",
    targetId: cancelled.id,
    beforeData: existing,
    afterData: cancelled,
    reason: body.cancellationReason ?? null,
  });
  await enqueueNotification(supabase, {
    eventType: "reservation_cancelled",
    targetUserId: existing.ownerUserId,
    targetType: "reservation",
    targetId: cancelled.id,
    data: { startTime: existing.startTime, endTime: existing.endTime, destination: existing.destination },
    idempotencyKey: `reservation_cancelled:${cancelled.id}`,
  });

  return NextResponse.json({ ok: true, reservation: cancelled });
}
