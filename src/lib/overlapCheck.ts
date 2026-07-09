import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 指定した時間帯とすでに重複する予約が存在するかを確認する。
 * excludeId を指定すると、その予約自身は重複判定から除外する（編集時に使用）。
 *
 * 判定式（要件どおり）:
 *   新規開始 < 既存終了  かつ  新規終了 > 既存開始
 */
export async function hasOverlappingReservation(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
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

/** Postgres の EXCLUDE 制約違反（同時登録によるレースコンディション対策） */
export function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23P01"
  );
}
