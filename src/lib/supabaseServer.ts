import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Server Component / Route Handler 用の Supabase クライアント。
// anon key + Cookie のユーザーセッションで動作するため、RLS がそのまま適用される
// （lib/supabaseAdmin.ts の service role クライアントと違い、認可をバイパスしない）。
// ログイン中ユーザーの認証状態を確認する用途にのみ使う。
export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase の環境変数が設定されていません（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）。"
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Component からの呼び出しでは Cookie を書き換えられない
          // （ミドルウェアがセッションのリフレッシュを担当するため無視してよい）。
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // 同上
        }
      },
    },
  });
}
