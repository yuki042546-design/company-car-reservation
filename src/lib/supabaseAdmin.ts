import { createClient, SupabaseClient } from "@supabase/supabase-js";

// サーバー（API ルート）専用のクライアント。service role key を使うため
// RLS をバイパスできる。このファイルはブラウザ向けバンドルに含めないこと
// （NEXT_PUBLIC_ を付けていない環境変数を読むので、クライアント側で
// import すると値が undefined になり実行時エラーになる）。
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase の環境変数が設定されていません（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）。"
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      // Next.js App Router は Server Component 内の fetch を既定で
      // キャッシュする（Data Cache）。Supabase クライアントは内部で
      // fetch を使っているため、何も指定しないと「今日の予約」等の
      // クエリ結果が初回アクセス時のまま固定されてしまう。
      // 予約データは常に最新である必要があるため明示的にキャッシュを無効化する。
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}
