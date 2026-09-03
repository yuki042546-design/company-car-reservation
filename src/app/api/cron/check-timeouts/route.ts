import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { getVehicleById } from "@/lib/vehicles";
import { writeAuditLog } from "@/lib/auditLog";
import { enqueueNotification, processPendingDeliveries } from "@/lib/notifications/outbox";
import type { Reservation } from "@/lib/types";

export const runtime = "nodejs";

const NO_SHOW_GRACE_MINUTES = 30;

// GET /api/cron/check-timeouts
// Supabase の pg_cron から15分おきに呼び出される想定のエンドポイント
// （Vercel Cronは無料プランだと1日1回までしか実行できないため使わない）。
// CRON_SECRET が一致しない呼び出しはすべて401で拒否する。
//
// - 返却されないまま終了予定時刻を過ぎた「使用中」の予約 → overdue（返却遅延）
// - 出発されないまま開始時刻から一定時間（猶予）過ぎた「予約済み」の予約 → no_show（未使用）
// のいずれもDBの一括UPDATEで検出し、監査ログと通知（管理者宛て）を残す。
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ errors: ["CRON_SECRET is not configured"] }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ errors: ["unauthorized"] }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const noShowThreshold = new Date(now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000);

  const { data: overdueRows, error: overdueError } = await supabase
    .from("reservations")
    .update({ status: "overdue" })
    .eq("status", "in_use")
    .lt("end_time", now.toISOString())
    .select("*");

  if (overdueError) {
    console.error("Failed to mark overdue reservations", overdueError);
  }

  const { data: noShowRows, error: noShowError } = await supabase
    .from("reservations")
    .update({ status: "no_show" })
    .eq("status", "reserved")
    .lt("start_time", noShowThreshold.toISOString())
    .select("*");

  if (noShowError) {
    console.error("Failed to mark no-show reservations", noShowError);
  }

  await notifyTransitions(supabase, (overdueRows as ReservationRow[]) ?? [], "overdue");
  await notifyTransitions(supabase, (noShowRows as ReservationRow[]) ?? [], "no_show");

  // 通知の送信自体は本来 /api/cron/process-notifications（Vercel Cronで1日1回）が
  // 担当するが、Vercel無料プランではそれが1日1回しか動かず、新着の予約通知等が
  // 最大24時間滞留してしまう。このエンドポイントはSupabaseのpg_cronから15分おきに
  // 呼ばれる想定のため、ついでに未送信の通知もここで処理してしまう。
  await processPendingDeliveries(supabase);

  return NextResponse.json({
    ok: true,
    overdue: overdueRows?.length ?? 0,
    noShow: noShowRows?.length ?? 0,
  });
}

async function notifyTransitions(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rows: ReservationRow[],
  kind: "overdue" | "no_show"
): Promise<void> {
  for (const row of rows) {
    const reservation: Reservation = mapReservationRow(row);
    const vehicle = await getVehicleById(reservation.vehicleId);

    await writeAuditLog(supabase, {
      actorUserId: null,
      actorEmail: "system",
      action: kind === "overdue" ? "reservation_auto_overdue" : "reservation_auto_no_show",
      targetType: "reservation",
      targetId: reservation.id,
      afterData: reservation,
    });

    await enqueueNotification(supabase, {
      eventType: kind === "overdue" ? "return_overdue" : "reservation_no_show",
      targetUserId: null,
      targetType: "reservation",
      targetId: reservation.id,
      data: {
        employeeName: reservation.employeeName,
        vehicleName: vehicle?.name ?? "",
        destination: reservation.destination,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
      },
      idempotencyKey: `${kind === "overdue" ? "return_overdue" : "reservation_no_show"}:${reservation.id}`,
    });
  }
}
