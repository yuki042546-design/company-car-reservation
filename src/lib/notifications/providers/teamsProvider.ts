import type { NotificationProvider } from "../types";

// Microsoft Teams のIncoming Webhook（Office 365 Connector形式）経由の通知プロバイダー。
// TEAMS_WEBHOOK_URL が設定されている場合のみ registry.ts から有効化される。
//
// 注意: TeamsチームがすでにPower Automateの「Webhookの要求を受信したとき」フローへ
// 移行している場合、ペイロード形式がそのフローのトリガースキーマに依存するため、
// 下記のMessageCard形式では届かない可能性がある。その場合は本ファイルの
// buildPayload() をフロー側のスキーマに合わせて調整すること。

function formatDateTime(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// イベント種別ごとの読みやすい日本語メッセージ。ここに無いイベント種別は
// 汎用フォーマット（キーと値の一覧）にフォールバックする。
const MESSAGE_BUILDERS: Record<string, (data: Record<string, unknown>) => { title: string; text: string }> = {
  reservation_created: (d) => ({
    title: "🚗 新しい予約",
    text: `**${d.employeeName}** さんが **${d.vehicleName}** を予約しました。\n\n行き先: ${d.destination}\n用途: ${d.purpose}\n利用時間: ${formatDateTime(d.startTime)} 〜 ${formatDateTime(d.endTime)}`,
  }),
  return_overdue: (d) => ({
    title: "⚠️ 返却遅延",
    text: `**${d.vehicleName}**（利用者: ${d.employeeName}）が返却予定時刻を過ぎても返却されていません。\n\n返却予定時刻: ${formatDateTime(d.endTime)}\n行き先: ${d.destination}`,
  }),
  reservation_no_show: (d) => ({
    title: "❓ 未使用（No-show）",
    text: `**${d.employeeName}** さんの **${d.vehicleName}** 予約が、開始時刻を過ぎても出発操作が行われていません。\n\n開始予定時刻: ${formatDateTime(d.startTime)}\n行き先: ${d.destination}`,
  }),
};

function buildPayload(payload: { eventType: string; data: Record<string, unknown> }) {
  const builder = MESSAGE_BUILDERS[payload.eventType];
  const { title, text } = builder
    ? builder(payload.data)
    : {
        title: `社用車予約システム: ${payload.eventType}`,
        text: Object.entries(payload.data)
          .map(([key, value]) => `**${key}**: ${String(value)}`)
          .join("\n\n"),
      };

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
