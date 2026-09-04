"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "./LocaleProvider";

// トップ画面を開くたび、最低限守ってほしいルールと「使い方」への導線を表示する。
// 閉じるのはその場限りで、他のタブへ移動してトップに戻ってくれば再び表示される
// （永続化はしない。閉じた状態を端末に覚えさせると、以後ずっと見えなくなるため）。
export function FirstVisitGuideBanner() {
  const { dict } = useI18n();
  const [visible, setVisible] = useState(true);

  function dismiss() {
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
