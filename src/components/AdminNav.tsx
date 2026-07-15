"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavProps {
  tabs: { href: string; label: string }[];
}

export function AdminNav({ tabs }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            pathname === tab.href
              ? "rounded-full bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
              : "rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
