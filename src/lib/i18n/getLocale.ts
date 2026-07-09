import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME, type Locale } from "./locales";

/** サーバー側（Server Component / Route Handler）で現在の言語設定を取得する */
export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
