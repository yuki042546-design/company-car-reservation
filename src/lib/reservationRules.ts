import type { ReservationInput } from "./types";

export const SLOT_MINUTES = 30;
export const MIN_DURATION_MINUTES = 30;
export const MAX_DURATION_MINUTES = 240; // 4時間

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isOnSlotBoundary(date: Date): boolean {
  return date.getSeconds() === 0 && date.getMilliseconds() === 0 && date.getMinutes() % SLOT_MINUTES === 0;
}

/**
 * 予約内容の入力チェック（必須項目・30分単位・過去日時・使用時間の上限下限）。
 * サーバー（API ルート）とクライアント（フォーム）の両方から呼ばれる、
 * このアプリの「予約時間のルール」の唯一の実装。
 */
export function validateReservationInput(input: ReservationInput, now: Date = new Date()): ValidationResult {
  const errors: string[] = [];

  if (!input.employeeName?.trim()) errors.push("使用者名を選択してください。");
  if (!input.destination?.trim()) errors.push("行き先を入力してください。");
  if (!input.purpose?.trim()) errors.push("用途を入力してください。");
  if (!input.startTime) errors.push("開始日時を入力してください。");
  if (!input.endTime) errors.push("終了日時を入力してください。");

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, errors: ["日時の形式が正しくありません。"] };
  }

  if (!isOnSlotBoundary(start)) {
    errors.push("開始日時は30分単位（00分または30分）で指定してください。");
  }
  if (!isOnSlotBoundary(end)) {
    errors.push("終了日時は30分単位（00分または30分）で指定してください。");
  }

  if (start.getTime() < now.getTime()) {
    errors.push("過去の日時は予約できません。");
  }

  if (end.getTime() <= start.getTime()) {
    errors.push("終了日時は開始日時より後にしてください。");
  } else {
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    if (durationMinutes < MIN_DURATION_MINUTES) {
      errors.push("使用時間は30分以上にしてください。");
    }
    if (durationMinutes > MAX_DURATION_MINUTES) {
      errors.push("使用時間は4時間以内にしてください。");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 予約重複チェック。
 *
 * 「新しい予約の開始時刻 < 既存予約の終了時刻」かつ
 * 「新しい予約の終了時刻 > 既存予約の開始時刻」であれば重複とみなす。
 * （区間の端がぴったり接する場合＝ 11:00終了 と 11:00開始 は重複扱いにしない）
 */
export function isOverlapping(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date
): boolean {
  return newStart.getTime() < existingEnd.getTime() && newEnd.getTime() > existingStart.getTime();
}
