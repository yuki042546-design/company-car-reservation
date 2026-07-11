import type { NotificationProvider } from "../types";

// Slack Incoming Webhook 経由の通知プロバイダー（例）。
// SLACK_WEBHOOK_URL が設定されている場合のみ registry.ts から有効化される。
// 実際のWebhook URLが用意できていないため、現時点では未検証（IMPLEMENTATION_STATUS.md参照）。
export const slackProvider: NotificationProvider = {
  channel: "slack",
  async send(payload) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return { ok: false, error: "SLACK_WEBHOOK_URL is not configured" };
    }
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `[${payload.eventType}] ${JSON.stringify(payload.data)}` }),
      });
      if (!res.ok) {
        return { ok: false, error: `Slack webhook returned ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
    }
  },
};
