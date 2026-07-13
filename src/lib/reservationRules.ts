import type { Dictionary } from "./i18n/dictionary";
import type { AppSettings, ReservationInput } from "./types";

export const SLOT_MINUTES = 30;
// 以下はDB/管理設定が取得できない場合のフォールバック値。
export const DEFAULT_MIN_DURATION_MINUTES = 30;
export const DEFAULT_BOOKING_HORIZON_DAYS = 90;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isOnSlotBoundary(date: Date): boolean {
  return date.getSeconds() === 0 && date.getMilliseconds() === 0 && date.getMinutes() % SLOT_MINUTES === 0;
}

export interface ReservationRuleLimits {
  minDurationMinutes: number;
  bookingHorizonDays: number;
}

/** app_settings から検証ルールの上限値を取り出す。使用時間の上限は設けていない。 */
export function limitsFromAppSettings(settings: AppSettings): ReservationRuleLimits {
  return {
    minDurationMinutes: settings.minimumDurationMinutes,
    bookingHorizonDays: settings.bookingHorizonDays,
  };
}

const DEFAULT_LIMITS: ReservationRuleLimits = {
  minDurationMinutes: DEFAULT_MIN_DURATION_MINUTES,
  bookingHorizonDays: DEFAULT_BOOKING_HORIZON_DAYS,
};

/**
 * 予約内容の入力チェック（必須項目・30分単位・過去日時・使用時間の上限下限・予約可能期間）。
 * サーバー（API ルート）とクライアント（フォーム）の両方から呼ばれる、
 * このアプリの「予約時間のルール」の唯一の実装。
 * 上限値は app_settings から取得した limits を渡す（省略時はコード内の既定値）。
 */
export function validateReservationInput(
  input: ReservationInput,
  dict: Dictionary,
  now: Date = new Date(),
  limits: ReservationRuleLimits = DEFAULT_LIMITS
): ValidationResult {
  const errors: string[] = [];
  const v = dict.validation;

  if (!input.employeeName?.trim()) errors.push(v.employeeNameRequired);
  if (!input.destination?.trim()) errors.push(v.destinationRequired);
  if (!input.purpose?.trim()) errors.push(v.purposeRequired);
  if (!input.startTime) errors.push(v.startTimeRequired);
  if (!input.endTime) errors.push(v.endTimeRequired);

  // 文字数制限（過剰な入力サイズ・意図しないHTML/スクリプト混入への防御の一環）。
  if (input.destination && input.destination.length > 200) errors.push(v.destinationTooLong);
  if (input.purpose && input.purpose.length > 200) errors.push(v.purposeTooLong);
  if (input.note && input.note.length > 1000) errors.push(v.noteTooLong);

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

  const horizonMs = limits.bookingHorizonDays * 24 * 60 * 60 * 1000;
  if (start.getTime() > now.getTime() + horizonMs) {
    errors.push(v.beyondBookingHorizon(limits.bookingHorizonDays));
  }

  if (end.getTime() <= start.getTime()) {
    errors.push(v.endBeforeStart);
  } else {
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    if (durationMinutes < limits.minDurationMinutes) {
      errors.push(v.tooShort);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 予約重複チェック（純粋関数版。単体テスト・将来のクライアント側プレビュー表示に使う）。
 * 「新しい予約の開始時刻 < 既存予約の終了時刻」かつ
 * 「新しい予約の終了時刻 > 既存予約の開始時刻」であれば重複とみなす。
 */
export function isOverlapping(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date
): boolean {
  return newStart.getTime() < existingEnd.getTime() && newEnd.getTime() > existingStart.getTime();
}
