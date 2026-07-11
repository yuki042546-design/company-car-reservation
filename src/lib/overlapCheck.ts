import type { SupabaseClient } from "@supabase/supabase-js";

// 重複判定の対象となる予約ステータス（キャンセル済み・完了・無断キャンセルは対象外）。
// DB側の部分排他制約（no_overlapping_reservations の WHERE句）と必ず一致させること。
const ACTIVE_RESERVATION_STATUSES = ["reserved", "in_use", "overdue"];

/**
 * 指定した車両・時間帯とすでに重複する「有効な」予約が存在するかを確認する。
 * excludeId を指定すると、その予約自身は重複判定から除外する（編集時に使用）。
 *
 * 判定式（要件どおり）:
 *   新規開始 < 既存終了  かつ  新規終了 > 既存開始
 */
export async function hasOverlappingReservation(
  supabase: SupabaseClient,
  vehicleId: string,
  start: Date,
  end: Date,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .in("status", ACTIVE_RESERVATION_STATUSES)
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString());

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }
  return (count ?? 0) > 0;
}

/**
 * 指定した車両・時間帯と重複する整備・利用停止期間（maintenance_blocks）が
 * 存在するかを確認する。DBの排他制約はテーブルをまたげないため、この
 * アプリ側チェックが唯一の防衛線になる（呼び出し側でアドバイザリーロックと
 * 組み合わせて同時実行の競合を防ぐこと。lib/reservationTx.ts 参照）。
 */
export async function hasOverlappingMaintenanceBlock(
  supabase: SupabaseClient,
  vehicleId: string,
  start: Date,
  end: Date
): Promise<boolean> {
  const { count, error } = await supabase
    .from("maintenance_blocks")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .in("status", ["scheduled", "in_progress"])
    .lt("start_at", end.toISOString())
    .gt("end_at", start.toISOString());

  if (error) {
    throw error;
  }
  return (count ?? 0) > 0;
}

/** Postgres の EXCLUDE 制約違反（同時登録によるレースコンディション対策） */
export function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23P01"
  );
}
