import type { NotificationProvider } from "../types";

// 開発・検証用のプロバイダー。実際には何も送信せず、コンソールへ出力するだけ。
// 外部サービスの認証情報が用意できるまでの間、このプロバイダーだけを有効にしておく。
export const devLogProvider: NotificationProvider = {
  channel: "log",
  async send(payload) {
    console.log("[notification]", payload.eventType, JSON.stringify(payload.data));
    return { ok: true };
  },
};
