import type { NotificationProvider } from "../types";
import { buildNotificationMessage } from "../messageText";

// Microsoft Teams のIncoming Webhook（Office 365 Connector形式）経由の通知プロバイダー。
// TEAMS_WEBHOOK_URL が設定されている場合のみ registry.ts から有効化される。
//
// 注意: 従来の「コネクタ」形式の受信Webhookは廃止され、現在は「Workflows」アプリ
// （Power Automateの「Webhookの要求を受信したときにチャネルに投稿する」テンプレート）
// 経由でのみ発行できる。そちらのトリガーが期待するペイロード形式が下記のMessageCard形式と
// 異なる場合は、buildPayload() をそのスキーマに合わせて調整すること。
// また個人（コンシューマー）向けMicrosoftアカウントのTeamsにはチーム/チャネル/ワークフローの
// 概念自体が無く、この機能は利用できない（組織向けTeamsのみ）。

function buildPayload(payload: { eventType: string; data: Record<string, unknown> }) {
  const { title, text } = buildNotificationMessage(payload.eventType, payload.data);

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: title,
    themeColor: "3D4A6B",
    title,
    text,
  };
}

export const teamsProvider: NotificationProvider = {
  channel: "teams",
  async send(payload) {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl) {
      return { ok: false, error: "TEAMS_WEBHOOK_URL is not configured" };
    }
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(payload)),
      });
      if (!res.ok) {
        return { ok: false, error: `Teams webhook returned ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
    }
  },
};
