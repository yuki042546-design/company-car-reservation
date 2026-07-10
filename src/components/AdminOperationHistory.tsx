import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import type { ReservationLog } from "@/lib/types";
import { formatDateTime } from "@/lib/dateUtils";

interface AdminOperationHistoryProps {
  logs: ReservationLog[];
  dict: Dictionary;
  locale: Locale;
}

export function AdminOperationHistory({ logs, dict, locale }: AdminOperationHistoryProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">{dict.admin.historyEmpty}</p>;
  }

  const actionLabel: Record<ReservationLog["action"], string> = {
    create: dict.admin.historyActionCreate,
    update: dict.admin.historyActionUpdate,
    delete: dict.admin.historyActionDelete,
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">{dict.admin.historyColumnTimestamp}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.historyColumnAction}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.historyColumnName}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.historyColumnDetail}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-100 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-gray-700">
                {formatDateTime(log.createdAt, locale)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">{actionLabel[log.action]}</td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">{log.employeeName}</td>
              <td className="px-3 py-2 text-gray-500">
                {log.reservationStartTime && log.reservationEndTime
                  ? `${formatDateTime(log.reservationStartTime, locale)} 〜 ${formatDateTime(log.reservationEndTime, locale)}${
                      log.reservationDestination ? ` / ${log.reservationDestination}` : ""
                    }`
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
