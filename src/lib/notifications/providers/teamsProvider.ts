import type { NotificationProvider } from "../types";

// Microsoft Teams のIncoming Webhook（Office 365 Connector形式）経由の通知プロバイダー。
// TEAMS_WEBHOOK_URL が設定されている場合のみ registry.ts から有効化される。
//
// 注意: TeamsチームがすでにPower Automateの「Webhookの要求を受信したとき」フローへ
// 移行している場合、ペイロード形式がそのフローのトリガースキーマに依存するため、
// 下記のMessageCard形式では届かない可能性がある。その場合は本ファイルの
// buildPayload() をフロー側のスキーマに合わせて調整すること。
// 実際のWebhook URLが用意できていないため、現時点では未検証（IMPLEMENTATION_STATUS.md参照）。
function buildPayload(payload: { eventType: string; data: Record<string, unknown> }) {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: `社用車予約: ${payload.eventType}`,
    themeColor: "3D4A6B",
    title: `社用車予約システム: ${payload.eventType}`,
    text: Object.entries(payload.data)
      .map(([key, value]) => `**${key}**: ${String(value)}`)
      .join("\n\n"),
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
