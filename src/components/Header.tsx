"use client";

import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "./LocaleProvider";

export function Header() {
  const { dict } = useI18n();

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2 text-[14px] font-bold tracking-tight text-gray-900 sm:gap-2.5 sm:text-[15px]"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <circle cx="8" cy="14" r="3.2" />
              <path d="M10.8 11.8 19 3.6" />
              <path d="M15.5 8.1 18 5.6M17.7 5.4l2 2" />
            </svg>
          </span>
          <span className="truncate">{dict.nav.appName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <nav className="flex gap-2.5 text-[12px] font-semibold sm:gap-5 sm:text-[13px]">
            <Link href="/reservations" className="whitespace-nowrap text-gray-500 hover:text-brand-600">
              {dict.nav.reservations}
            </Link>
            <Link href="/admin" className="whitespace-nowrap text-gray-500 hover:text-brand-600">
              {dict.nav.admin}
            </Link>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
