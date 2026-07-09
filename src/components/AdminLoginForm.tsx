"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "./LocaleProvider";

export function AdminLoginForm() {
  const { dict } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.admin.loginGenericError);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.admin.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">{dict.admin.loginTitle}</h2>
      {error && <p className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="admin-password">
          {dict.admin.passwordLabel}
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          required
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-600 py-3 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? dict.admin.loginButtonBusy : dict.admin.loginButton}
      </button>
    </form>
  );
}
