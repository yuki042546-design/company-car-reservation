import ja from "./dictionaries/ja";
import vi from "./dictionaries/vi";
import type { Locale } from "./locales";

export type { Dictionary } from "./dictionaries/ja";

const dictionaries = { ja, vi };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
