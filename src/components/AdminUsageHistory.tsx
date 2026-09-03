import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import type { UsageHistoryEntry } from "@/lib/types";
import { formatDateTime, formatMonthLabel, getJstDateKey } from "@/lib/dateUtils";

interface AdminUsageHistoryProps {
  entries: UsageHistoryEntry[];
  dict: Dictionary;
  locale: Locale;
}

function monthKeyOf(entry: UsageHistoryEntry): string {
  return entry.returnedAt ? getJstDateKey(entry.returnedAt).slice(0, 7) : "";
}

export function AdminUsageHistory({ entries, dict, locale }: AdminUsageHistoryProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">{dict.admin.usageHistoryEmpty}</p>;
  }

  // entries は returnedAt の降順で渡されるため、月ごとにまとめても順序は保たれる。
  const groups: { monthKey: string; items: UsageHistoryEntry[] }[] = [];
  for (const entry of entries) {
    const monthKey = monthKeyOf(entry);
    const group = groups[groups.length - 1];
    if (group && group.monthKey === monthKey) {
      group.items.push(entry);
    } else {
      groups.push({ monthKey, items: [entry] });
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.monthKey || "unknown"}>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">
            {group.monthKey ? formatMonthLabel(group.monthKey, locale) : "-"}
          </h3>
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
                {group.items.map((entry) => (
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
        </div>
      ))}
    </div>
  );
}
