// ログイン機能がないため、「自分の予約」タブの絞り込みに使う、ブラウザに
// 記憶した最後の使用者名。個人の端末で使う分には便利だが、共用PCでは
// 前の利用者の名前が残る点に注意（予約フォームで選び直せば上書きされる）。
export const LAST_EMPLOYEE_NAME_KEY = "lastEmployeeName";

export function rememberEmployeeName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_EMPLOYEE_NAME_KEY, name);
}
