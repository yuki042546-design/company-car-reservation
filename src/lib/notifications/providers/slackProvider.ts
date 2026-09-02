import type { NotificationProvider } from "../types";
import { buildNotificationMessage } from "../messageText";

// Slack Incoming Webhook 経由の通知プロバイダー。
// SLACK_WEBHOOK_URL が設定されている場合のみ registry.ts から有効化される。
export const slackProvider: NotificationProvider = {
  channel: "slack",
  async send(payload) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return { ok: false, error: "SLACK_WEBHOOK_URL is not configured" };
    }
    try {
      const { title, text } = buildNotificationMessage(payload.eventType, payload.data);
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `*${title}*\n${text}` }),
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
