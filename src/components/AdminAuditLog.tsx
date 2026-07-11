import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import type { AuditLog } from "@/lib/types";
import { formatDateTime } from "@/lib/dateUtils";

interface AdminAuditLogProps {
  logs: AuditLog[];
  dict: Dictionary;
  locale: Locale;
}

// 予約以外も含む全操作（出発・返却・延長・車両状態変更・権限変更など）の監査ログ表示。
// reservation_logs（予約の作成/変更/キャンセルのみの簡易履歴）とは別の、より網羅的な記録。
export function AdminAuditLog({ logs, dict, locale }: AdminAuditLogProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">{dict.admin.auditLogEmpty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnTimestamp}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnActor}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnAction}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnTarget}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnReason}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-100 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-gray-700">
                {formatDateTime(log.createdAt, locale)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">{log.actorEmail ?? "-"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">{log.action}</td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                {log.targetType ? `${log.targetType}${log.targetId ? ` / ${log.targetId.slice(0, 8)}…` : ""}` : "-"}
              </td>
              <td className="px-3 py-2 text-gray-500">{log.reason ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
