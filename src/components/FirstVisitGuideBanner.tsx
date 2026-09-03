"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "./LocaleProvider";

const DISMISSED_KEY = "onboardingBannerDismissed";

// 初めてこの端末でトップ画面を開いた人向けに、最低限守ってほしいルールと
// 「使い方」への導線を表示する。一度閉じると、この端末では以後表示しない。
// サーバー側ではlocalStorageの状態が分からないため、初期状態は必ず非表示にし、
// マウント後にだけ判定して表示する（SSR/CSRの不一致を避けるため）。
export function FirstVisitGuideBanner() {
  const { dict } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold">{dict.onboarding.title}</p>
        <button
          onClick={dismiss}
          aria-label={dict.onboarding.dismiss}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
        >
          ✕
        </button>
      </div>
      <ul className="mt-2 list-inside list-disc space-y-1 leading-relaxed text-amber-800">
        <li>{dict.onboarding.point1}</li>
        <li>{dict.onboarding.point2}</li>
        <li>{dict.onboarding.point3}</li>
      </ul>
      <Link href="/guide" className="mt-3 inline-block font-semibold text-amber-700 underline hover:text-amber-900">
        {dict.onboarding.guideLink}
      </Link>
    </div>
  );
}
