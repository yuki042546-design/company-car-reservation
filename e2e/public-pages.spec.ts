import { expect, test } from "@playwright/test";

// これらは認証不要な公開ページのみを対象とするスモークテスト。
// ログイン後のフロー（新規予約・変更・キャンセル・出発・延長・返却・管理者操作・
// 言語切替の実動作確認など）は、実際のSupabaseプロジェクトに検証用ユーザーを
// 用意した上で e2e/authenticated/ 配下に追加してください（未実装、詳細はIMPLEMENTATION_STATUS.md）。

test("cover page shows the title and three navigation tabs, no header", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("豊桑産業")).toBeVisible();
  await expect(page.getByText("Car-Reservation System")).toBeVisible();
  await expect(page.getByRole("link", { name: /予約/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "管理者" })).toBeVisible();
  await expect(page.getByRole("link", { name: "使い方" })).toBeVisible();
});

test("guide page is reachable without login and has a header", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.getByRole("heading", { name: "使い方" })).toBeVisible();
});

test("protected pages redirect an unauthenticated visitor to /login", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
});

test("protected admin page redirects an unauthenticated visitor to /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});
