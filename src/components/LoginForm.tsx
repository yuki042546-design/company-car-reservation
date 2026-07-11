"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useI18n } from "./LocaleProvider";

export function LoginForm() {
  const { dict } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(dict.login.invalidCredentials);
        return;
      }
      // "next" はミドルウェアが未ログイン時に付与する戻り先。オープンリダイレクト対策として
      // 相対パス（"/"始まり）以外は無視する。
      const next = searchParams.get("next");
      const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
      router.push(destination);
      router.refresh();
    } catch {
      setError(dict.login.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-800">{dict.login.title}</h2>
      {error && <p className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="login-email">
          {dict.login.emailLabel}
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="login-password">
          {dict.login.passwordLabel}
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
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
        {submitting ? dict.login.submittingButton : dict.login.submitButton}
      </button>
      <p className="text-center text-xs text-gray-400">{dict.login.inviteOnlyNote}</p>
    </form>
  );
}
