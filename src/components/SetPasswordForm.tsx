"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useI18n } from "./LocaleProvider";

// 招待メール・パスワード再設定メールのリンクからこのページへ来ると、
// Supabase JS SDK が URL のフラグメント（#access_token=...）を検知して
// 自動的にセッションを確立する（detectSessionInUrl のデフォルト動作）。
// そのセッションを使って新しいパスワードを設定する。
export function SetPasswordForm() {
  const { dict } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(dict.setPassword.tooShort);
      return;
    }
    if (password !== confirm) {
      setError(dict.setPassword.mismatch);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(dict.setPassword.genericError);
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/home");
        router.refresh();
      }, 1200);
    } catch {
      setError(dict.setPassword.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="mx-auto max-w-sm rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-700">
        {dict.setPassword.successMessage}
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      {error && <p className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="new-password">
          {dict.setPassword.newPasswordLabel}
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          required
          minLength={8}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="confirm-password">
          {dict.setPassword.confirmPasswordLabel}
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          required
          minLength={8}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-600 py-3 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? dict.setPassword.submittingButton : dict.setPassword.submitButton}
      </button>
    </form>
  );
}
