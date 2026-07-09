"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "./LocaleProvider";

export function AdminLogoutButton() {
  const { dict } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      {dict.admin.logoutButton}
    </button>
  );
}
