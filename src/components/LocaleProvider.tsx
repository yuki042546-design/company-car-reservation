"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { LOCALE_COOKIE_MAX_AGE_SECONDS, LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n/locales";

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  initialLocale: Locale;
  children: React.ReactNode;
}

// アプリ全体をラップし、クライアントコンポーネントに現在の言語設定と
// 辞書(dict)を配る。サーバーコンポーネント側は cookies() から直接
// getLocale()/getDictionary() を呼ぶため、ここで扱うのはクライアント側のみ。
export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // 言語切替後に router.refresh() でサーバーコンポーネントが再描画されると
  // このコンポーネント自体は再マウントされず initialLocale だけ更新されるため、
  // それに追従させる。
  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}`;
    router.refresh();
  }

  const dict = getDictionary(locale);

  return <LocaleContext.Provider value={{ locale, dict, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n は LocaleProvider の内側でのみ使用できます。");
  }
  return ctx;
}
