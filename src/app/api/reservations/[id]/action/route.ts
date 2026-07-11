import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { requireApiUser, roleAtLeast } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { canTransitionReservation } from "@/lib/reservationStatus";
import { hasOverlappingMaintenanceBlock, hasOverlappingReservation, isExclusionViolation } from "@/lib/overlapCheck";
import { writeAuditLog } from "@/lib/auditLog";
import { enqueueNotification } from "@/lib/notifications/outbox";

export const runtime = "nodejs";

interface RouteParams {
  params: { id: string };
}

type ActionBody =
  | { action: "depart"; departureOdometer?: number; fuelLevelAtDeparture?: number; issueDescription?: string }
  | {
      action: "return";
      returnOdometer?: number;
      fuelLevelAtReturn?: number;
      refueled?: boolean;
      issueReported?: boolean;
      issueDescription?: string;
      interiorCondition?: string;
      damageReported?: boolean;
      damageDescription?: string;
      notes?: string;
    }
  | { action: "extend"; newEndTime: string }
  | { action: "report_issue"; issueDescription: string };

// POST /api/reservations/[id]/action - 出発・返却・延長・異常報告
// これらは予約の「利用」フェーズの操作であり、予約者本人（owner_user_id一致）または
// vehicle_manager以上のみ実行できる。ステータス遷移はlib/reservationStatus.tsのルールで検証する。
export async function POST(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const currentUser = auth.user;
  const isManager = roleAtLeast(currentUser.role, "vehicle_manager");

  let body: ActionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
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

  const isOwner = existing.ownerUserId !== null && existing.ownerUserId === currentUser.id;
  if (!isOwner && !isManager) {
    return NextResponse.json({ errors: [dict.apiErrors.forbidden] }, { status: 403 });
  }

  if (body.action === "depart") {
    if (!canTransitionReservation(existing.status, "in_use")) {
      return NextResponse.json({ errors: [dict.action.invalidTransition] }, { status: 409 });
    }

    const { data: updatedRow, error } = await supabase
      .from("reservations")
      .update({ status: "in_use", updated_by_user_id: currentUser.id })
      .eq("id", existing.id)
      .eq("status", "reserved")
      .select("*")
      .maybeSingle();

    if (error || !updatedRow) {
      return NextResponse.json({ errors: [dict.action.invalidTransition] }, { status: 409 });
    }

    await supabase.from("vehicle_usage_records").insert({
      reservation_id: existing.id,
      vehicle_id: existing.vehicleId,
      user_id: currentUser.id,
      checked_out_at: new Date().toISOString(),
      departure_odometer: body.departureOdometer ?? null,
      fuel_level_at_departure: body.fuelLevelAtDeparture ?? null,
      issue_reported: !!body.issueDescription,
      issue_description: body.issueDescription ?? null,
    });

    await supabase.from("vehicles").update({ status: "in_use" }).eq("id", existing.vehicleId);

    await writeAuditLog(supabase, {
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "reservation_depart",
      targetType: "reservation",
      targetId: existing.id,
      beforeData: { status: existing.status },
      afterData: { status: "in_use" },
    });

    return NextResponse.json({ reservation: mapReservationRow(updatedRow as ReservationRow) });
  }

  if (body.action === "return") {
    if (existing.status !== "in_use" && existing.status !== "overdue") {
      return NextResponse.json({ errors: [dict.action.invalidTransition] }, { status: 409 });
    }

    const { data: updatedRow, error } = await supabase
      .from("reservations")
      .update({ status: "completed", updated_by_user_id: currentUser.id })
      .eq("id", existing.id)
      .in("status", ["in_use", "overdue"])
      .select("*")
      .maybeSingle();

    if (error || !updatedRow) {
      return NextResponse.json({ errors: [dict.action.invalidTransition] }, { status: 409 });
    }

    await supabase
      .from("vehicle_usage_records")
      .update({
        returned_at: new Date().toISOString(),
        return_odometer: body.returnOdometer ?? null,
        fuel_level_at_return: body.fuelLevelAtReturn ?? null,
        refueled: body.refueled ?? false,
        issue_reported: body.issueReported ?? false,
        issue_description: body.issueDescription ?? null,
        interior_condition: body.interiorCondition ?? null,
        damage_reported: body.damageReported ?? false,
        damage_description: body.damageDescription ?? null,
        notes: body.notes ?? null,
      })
      .eq("reservation_id", existing.id);

    // 早期返却された場合も、待たせている次の予約がないなら車両を即座に利用可能へ戻す。
    await supabase.from("vehicles").update({ status: "available" }).eq("id", existing.vehicleId);

    await writeAuditLog(supabase, {
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "reservation_return",
      targetType: "reservation",
      targetId: existing.id,
      beforeData: { status: existing.status },
      afterData: { status: "completed" },
    });

    return NextResponse.json({ reservation: mapReservationRow(updatedRow as ReservationRow) });
  }

  if (body.action === "extend") {
    if (existing.status !== "in_use" && existing.status !== "reserved" && existing.status !== "overdue") {
      return NextResponse.json({ errors: [dict.action.invalidTransition] }, { status: 409 });
    }

    const newEnd = new Date(body.newEndTime);
    if (Number.isNaN(newEnd.getTime()) || newEnd.getTime() <= new Date(existing.endTime).getTime()) {
      return NextResponse.json({ errors: [dict.action.invalidExtension] }, { status: 400 });
    }

    const start = new Date(existing.startTime);

    const [overlapping, maintenanceConflict] = await Promise.all([
      hasOverlappingReservation(supabase, existing.vehicleId, start, newEnd, existing.id),
      hasOverlappingMaintenanceBlock(supabase, existing.vehicleId, start, newEnd),
    ]);

    if (overlapping || maintenanceConflict) {
      await enqueueNotification(supabase, {
        eventType: "extend_failed",
        targetUserId: existing.ownerUserId,
        targetType: "reservation",
        targetId: existing.id,
        data: { requestedEndTime: newEnd.toISOString(), reason: overlapping ? "overlap" : "maintenance_conflict" },
        idempotencyKey: `extend_failed:${existing.id}:${newEnd.toISOString()}`,
      });
      if (overlapping) {
        return NextResponse.json({ errors: [dict.validation.overlap] }, { status: 409 });
      }
      return NextResponse.json({ errors: [dict.validation.maintenanceConflict] }, { status: 409 });
    }

    const { data: updatedRow, error } = await supabase
      .from("reservations")
      .update({ end_time: newEnd.toISOString(), updated_by_user_id: currentUser.id })
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();

    if (error) {
      await enqueueNotification(supabase, {
        eventType: "extend_failed",
        targetUserId: existing.ownerUserId,
        targetType: "reservation",
        targetId: existing.id,
        data: { requestedEndTime: newEnd.toISOString(), reason: "db_error" },
        idempotencyKey: `extend_failed:${existing.id}:${newEnd.toISOString()}`,
      });
      if (isExclusionViolation(error)) {
        return NextResponse.json({ errors: [dict.validation.overlap] }, { status: 409 });
      }
      return NextResponse.json({ errors: [dict.action.invalidExtension] }, { status: 409 });
    }

    await writeAuditLog(supabase, {
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "reservation_extend",
      targetType: "reservation",
      targetId: existing.id,
      beforeData: { endTime: existing.endTime },
      afterData: { endTime: newEnd.toISOString() },
    });
    await enqueueNotification(supabase, {
      eventType: "extend_succeeded",
      targetUserId: existing.ownerUserId,
      targetType: "reservation",
      targetId: existing.id,
      data: { newEndTime: newEnd.toISOString() },
      idempotencyKey: `extend_succeeded:${existing.id}:${newEnd.toISOString()}`,
    });

    return NextResponse.json({ reservation: mapReservationRow(updatedRow as ReservationRow) });
  }

  if (body.action === "report_issue") {
    await supabase
      .from("vehicle_usage_records")
      .update({ issue_reported: true, issue_description: body.issueDescription })
      .eq("reservation_id", existing.id);

    await writeAuditLog(supabase, {
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "reservation_report_issue",
      targetType: "reservation",
      targetId: existing.id,
      reason: body.issueDescription,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
}
