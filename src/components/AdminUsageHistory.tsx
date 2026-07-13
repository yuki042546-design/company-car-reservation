import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import type { UsageHistoryEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/dateUtils";

interface AdminUsageHistoryProps {
  entries: UsageHistoryEntry[];
  dict: Dictionary;
  locale: Locale;
}

export function AdminUsageHistory({ entries, dict, locale }: AdminUsageHistoryProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">{dict.admin.usageHistoryEmpty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">{dict.admin.usageHistoryColumnDate}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.usageHistoryColumnEmployee}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.usageHistoryColumnDuration}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.usageHistoryColumnMileage}</th>
            <th className="px-3 py-2 font-medium">{dict.admin.usageHistoryColumnDestination}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-gray-100 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-gray-700">
                {entry.returnedAt ? formatDateTime(entry.returnedAt, locale) : "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">{entry.employeeName}</td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                {entry.durationMinutes !== null
                  ? dict.admin.usageHistoryDurationMinutes(entry.durationMinutes)
                  : "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                {entry.mileageKm !== null ? dict.admin.usageHistoryMileageKm(entry.mileageKm) : "-"}
              </td>
              <td className="px-3 py-2 text-gray-500">{entry.destination || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
