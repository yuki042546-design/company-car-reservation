import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { limitsFromAppSettings, validateReservationInput } from "@/lib/reservationRules";
import { isExclusionViolation } from "@/lib/overlapCheck";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
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
// ログイン機能がないため、本人確認は使用者名の自己申告一致で行う。
// - 予約時の使用者名（employee_name）と同じ名前で送信された場合のみ、開始前
//   （status='reserved'）の予約を本人として変更できる。
// - 管理者（共有パスワードでログイン中）は、開始後の予約も「訂正」として
//   変更できるが、reason（訂正理由）が必須。訂正内容は監査ログへ変更前後を記録する。
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  const isManager = isAdminRequest();

  const supabase = getSupabaseAdmin();

  let body: ReservationInput & { correctionReason?: string; requesterName?: string };
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

  const isOwner = !!body.requesterName && body.requesterName === existing.employeeName;
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
        p_updated_by_user_id: null,
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
      actorUserId: null,
      actorEmail: isManager ? "admin" : body.employeeName,
      action: isCorrection ? "reservation_correct" : "reservation_update",
      targetType: "reservation",
      targetId: updated.id,
      beforeData: existing,
      afterData: updated,
      reason: body.correctionReason ?? null,
    });
    await enqueueNotification(supabase, {
      eventType: "reservation_updated",
      targetUserId: null,
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
// ログイン機能がないため、本人確認は使用者名の自己申告一致で行う。
// - 予約時の使用者名（employee_name）と同じ名前で送信された場合のみ、開始前
//   （status='reserved'）の予約を本人としてキャンセルできる。
// - 管理者（共有パスワードでログイン中）は誰の予約でもキャンセルできるが、
//   reasonの入力が必須。
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  const isManager = isAdminRequest();

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
    const isOwner = !!body.requesterName && body.requesterName === existing.employeeName;
    if (!isOwner) {
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
      cancelled_by_user_id: null,
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
    actorUserId: null,
    actorEmail: isManager ? "admin" : existing.employeeName,
    action: "reservation_cancel",
    targetType: "reservation",
    targetId: cancelled.id,
    beforeData: existing,
    afterData: cancelled,
    reason: body.cancellationReason ?? null,
  });
  await enqueueNotification(supabase, {
    eventType: "reservation_cancelled",
    targetUserId: null,
    targetType: "reservation",
    targetId: cancelled.id,
    data: { startTime: existing.startTime, endTime: existing.endTime, destination: existing.destination },
    idempotencyKey: `reservation_cancelled:${cancelled.id}`,
  });

  return NextResponse.json({ ok: true, reservation: cancelled });
}
