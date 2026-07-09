"use client";

import { useI18n } from "./LocaleProvider";
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n/locales";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={
            locale === l
              ? "rounded-md bg-brand-600 px-2.5 py-1 font-semibold text-white"
              : "rounded-md px-2.5 py-1 text-gray-500 hover:text-gray-700"
          }
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
