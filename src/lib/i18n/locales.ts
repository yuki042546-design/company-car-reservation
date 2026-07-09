export type Locale = "ja" | "vi";

export const DEFAULT_LOCALE: Locale = "ja";
export const LOCALE_COOKIE_NAME = "locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1年

// 日付・時刻フォーマット（Intl.DateTimeFormat）で使うロケールタグ
export const INTL_LOCALE_TAG: Record<Locale, string> = {
  ja: "ja-JP",
  vi: "vi-VN",
};

// 言語切替ボタンに表示するラベル
export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  vi: "Tiếng Việt",
};

export const LOCALES: Locale[] = ["ja", "vi"];

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ja" || value === "vi";
}
