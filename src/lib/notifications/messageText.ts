// 通知プロバイダー（Teams/Slack等）共通の、イベント種別ごとの読みやすい日本語メッセージ組み立て。
// Markdown記法（太字等）はプロバイダーごとに書式が異なる（Teams: **text**、Slack: *text*）ため、
// ここでは装飾なしのプレーンテキストのみを組み立て、各プロバイダーがそのまま利用する。

function formatDateTime(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
    title: "❓ 未使用（No-show）",
    text: `${d.employeeName}さんの${d.vehicleName}予約が、開始時刻を過ぎても出発操作が行われていません。\n\n開始予定時刻: ${formatDateTime(d.startTime)}\n行き先: ${d.destination}`,
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
