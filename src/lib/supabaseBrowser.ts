"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// クライアントコンポーネント（ログインフォーム・パスワード設定画面）用の
// Supabase クライアント。anon key のみを使うため、ブラウザに公開して問題ない
// （データアクセスは RLS で制御される。service role key は絶対にここへ持ち込まない）。
export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase の環境変数が設定されていません（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）。"
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}
