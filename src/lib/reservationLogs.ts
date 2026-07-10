import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReservationLogAction } from "./types";

interface LogReservationActionParams {
  employeeName: string;
  startTime: string;
  endTime: string;
  destination: string;
}

// 予約の登録・変更・削除の操作履歴を記録する。管理者ページの「操作履歴」
// 表示専用のログであり、書き込みに失敗しても本来の予約操作は失敗させない
// （履歴保存はあくまで副次的な機能のため）。
export async function logReservationAction(
  supabase: SupabaseClient,
  action: ReservationLogAction,
  params: LogReservationActionParams
): Promise<void> {
  try {
    await supabase.from("reservation_logs").insert({
      action,
      employee_name: params.employeeName,
      reservation_start_time: params.startTime,
      reservation_end_time: params.endTime,
      reservation_destination: params.destination,
    });
  } catch (err) {
    console.error("Failed to write reservation log", err);
  }
}
