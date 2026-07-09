import type { Locale } from "./i18n/locales";
import type { Reservation } from "./types";

// 現在の表示言語が入力時の言語と異なる場合は、翻訳キャッシュがあれば
// それを表示する。翻訳が無い（APIが失敗した等）場合は元の文言のまま表示する。
export function displayDestination(reservation: Reservation, locale: Locale): string {
  if (reservation.inputLocale === locale) return reservation.destination;
  return reservation.destinationTranslated ?? reservation.destination;
}

export function displayPurpose(reservation: Reservation, locale: Locale): string {
  if (reservation.inputLocale === locale) return reservation.purpose;
  return reservation.purposeTranslated ?? reservation.purpose;
}
