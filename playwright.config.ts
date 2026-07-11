import { defineConfig, devices } from "@playwright/test";

// E2Eテストの実行には、実際のSupabaseプロジェクト（NEXT_PUBLIC_SUPABASE_URL等）と
// 動作中の開発サーバーが必要です。認証が絡むテスト（ログイン後のフロー）は、
// あらかじめSupabase Authに検証用ユーザーを作成した上で実行してください
// （詳細はe2e/README.mdおよびOPERATIONS.md参照）。
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
