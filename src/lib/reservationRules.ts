import type { Dictionary } from "./i18n/dictionary";
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
 * エラーメッセージは dict（言語ごとの辞書）から取得するため、
 * 呼び出し側は現在の言語設定に応じた dict を渡す。
 */
export function validateReservationInput(
  input: ReservationInput,
  dict: Dictionary,
  now: Date = new Date()
): ValidationResult {
  const errors: string[] = [];
  const v = dict.validation;

  if (!input.employeeName?.trim()) errors.push(v.employeeNameRequired);
  if (!input.destination?.trim()) errors.push(v.destinationRequired);
  if (!input.purpose?.trim()) errors.push(v.purposeRequired);
  if (!input.startTime) errors.push(v.startTimeRequired);
  if (!input.endTime) errors.push(v.endTimeRequired);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, errors: [v.invalidDateTime] };
  }

  if (!isOnSlotBoundary(start)) {
    errors.push(v.startNotOnSlot);
  }
  if (!isOnSlotBoundary(end)) {
    errors.push(v.endNotOnSlot);
  }

  if (start.getTime() < now.getTime()) {
    errors.push(v.pastDateTime);
  }

  if (end.getTime() <= start.getTime()) {
    errors.push(v.endBeforeStart);
  } else {
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    if (durationMinutes < MIN_DURATION_MINUTES) {
      errors.push(v.tooShort);
    }
    if (durationMinutes > MAX_DURATION_MINUTES) {
      errors.push(v.tooLong);
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
