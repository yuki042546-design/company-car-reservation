// 通知プロバイダー（Teams/Slack等）共通の、イベント種別ごとの読みやすい日本語メッセージ組み立て。
// Markdown記法（太字等）はプロバイダーごとに書式が異なる（Teams: **text**、Slack: *text*）ため、
// ここでは装飾なしのプレーンテキストのみを組み立て、各プロバイダーがそのまま利用する。

// サーバー（Vercel）はUTCで動作しているため、タイムゾーンを明示しないと
// 日本時間より9時間早い時刻が表示されてしまう。必ず Asia/Tokyo 固定で表示する
// （src/lib/dateUtils.ts の formatDateTime と同じ考え方）。
function formatDateTime(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

const MESSAGE_BUILDERS: Record<string, (data: Record<string, unknown>) => { title: string; text: string }> = {
  reservation_created: (d) => ({
    title: "🚗 新しい予約",
    text: `${d.employeeName}さんが${d.vehicleName}を予約しました。\n\n行き先: ${d.destination}\n用途: ${d.purpose}\n利用時間: ${formatDateTime(d.startTime)} 〜 ${formatDateTime(d.endTime)}`,
  }),
  return_overdue: (d) => ({
    title: "⚠️ 返却遅延",
    text: `${d.vehicleName}（利用者: ${d.employeeName}）が返却予定時刻を過ぎても返却されていません。\n\n返却予定時刻: ${formatDateTime(d.endTime)}\n行き先: ${d.destination}`,
  }),
  reservation_no_show: (d) => ({
    title: "❓ 未出発",
    text: `${d.employeeName}さんの${d.vehicleName}予約が、開始時刻を過ぎても出発操作が行われていません。\n\n開始予定時刻: ${formatDateTime(d.startTime)}\n行き先: ${d.destination}`,
  }),
  reservation_updated: (d) => ({
    title: "✏️ 予約が変更されました",
    text: `${d.employeeName}さんの予約が変更されました。\n\n行き先: ${d.destination}\n利用時間: ${formatDateTime(d.startTime)} 〜 ${formatDateTime(d.endTime)}`,
  }),
  reservation_cancelled: (d) => ({
    title: "🚫 予約がキャンセルされました",
    text:
      `${d.employeeName}さんの予約がキャンセルされました。\n\n行き先: ${d.destination}\n利用時間: ${formatDateTime(d.startTime)} 〜 ${formatDateTime(d.endTime)}` +
      (d.cancellationReason ? `\n理由: ${d.cancellationReason}` : ""),
  }),
  extend_succeeded: (d) => ({
    title: "⏱️ 利用時間が延長されました",
    text: `${d.employeeName}さんの予約が延長されました。\n\n新しい終了予定時刻: ${formatDateTime(d.newEndTime)}`,
  }),
  extend_failed: (d) => ({
    title: "⚠️ 延長に失敗しました",
    text: `${d.employeeName}さんの延長操作が失敗しました。\n\n希望終了時刻: ${formatDateTime(d.requestedEndTime)}\n理由: ${
      d.reason === "overlap" ? "次の予約と重複" : d.reason === "maintenance_conflict" ? "整備・利用停止期間と重複" : "システムエラー"
    }`,
  }),
};

/** イベント種別ごとの読みやすいメッセージ。未対応のイベント種別は汎用フォーマット（キーと値の一覧）にフォールバックする。 */
export function buildNotificationMessage(
  eventType: string,
  data: Record<string, unknown>
): { title: string; text: string } {
  const builder = MESSAGE_BUILDERS[eventType];
  if (builder) return builder(data);
  return {
    title: `社用車予約システム: ${eventType}`,
    text: Object.entries(data)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join("\n"),
  };
}
