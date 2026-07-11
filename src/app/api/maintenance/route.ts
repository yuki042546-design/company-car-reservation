import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, mapMaintenanceBlockRow, type MaintenanceBlockRow, type ReservationRow } from "@/lib/mappers";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { MaintenanceType } from "@/lib/types";

export const runtime = "nodejs";

const VALID_TYPES: MaintenanceType[] = ["inspection", "service", "repair", "tire_change", "cleaning", "other"];

// GET /api/maintenance - 整備・利用停止期間の一覧（vehicle_manager以上のみ）
export async function GET() {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const roleError = requireApiRole(auth.user, "vehicle_manager", dict);
  if (roleError) return roleError;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("maintenance_blocks")
    .select("*")
    .order("start_at", { ascending: false });

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }

  return NextResponse.json({ blocks: (data as MaintenanceBlockRow[]).map(mapMaintenanceBlockRow) });
}

// POST /api/maintenance - 整備・利用停止期間の登録（vehicle_manager以上のみ）
// 既存予約と競合する場合は、予約を勝手にキャンセルせず、競合している予約の一覧を
// 返して登録自体を拒否する（管理者が個別に判断してキャンセルしてから再登録する）。
export async function POST(request: NextRequest) {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const roleError = requireApiRole(auth.user, "vehicle_manager", dict);
  if (roleError) return roleError;

  let body: { vehicleId?: string; startAt?: string; endAt?: string; type?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  if (!body.vehicleId || !body.startAt || !body.endAt || !VALID_TYPES.includes(body.type as MaintenanceType)) {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const start = new Date(body.startAt);
  const end = new Date(body.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ errors: [dict.validation.endBeforeStart] }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 既存の有効な予約（reserved/in_use/overdue）との重複を確認する。
  const { data: conflicting, error: conflictError } = await supabase
    .from("reservations")
    .select("*")
    .eq("vehicle_id", body.vehicleId)
    .in("status", ["reserved", "in_use", "overdue"])
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString());

  if (conflictError) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }

  if (conflicting && conflicting.length > 0) {
    return NextResponse.json(
      {
        errors: [dict.maintenance.conflictError],
        conflictingReservations: (conflicting as ReservationRow[]).map(mapReservationRow),
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("maintenance_blocks")
    .insert({
      vehicle_id: body.vehicleId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      type: body.type,
      reason: body.reason?.trim() || null,
      created_by_user_id: auth.user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ errors: [dict.maintenance.createError] }, { status: 500 });
  }

  const block = mapMaintenanceBlockRow(data as MaintenanceBlockRow);

  await writeAuditLog(supabase, {
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: "maintenance_create",
    targetType: "maintenance_block",
    targetId: block.id,
    afterData: block,
  });

  return NextResponse.json({ block }, { status: 201 });
}
