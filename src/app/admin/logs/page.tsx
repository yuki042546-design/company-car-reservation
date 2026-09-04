import { getAuditLogs, getReservationLogs } from "@/lib/data";
import { resolveAdminDateRange } from "@/lib/dateUtils";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { AdminAuditLog } from "@/components/AdminAuditLog";
import { AdminDateRangeFilter } from "@/components/AdminDateRangeFilter";
import { AdminOperationHistory } from "@/components/AdminOperationHistory";

export const dynamic = "force-dynamic";

interface AdminLogsPageProps {
  searchParams: { from?: string; to?: string };
}

export default async function AdminLogsPage({ searchParams }: AdminLogsPageProps) {
  if (!isAdminRequest()) return null;

  const locale = getLocale();
  const dict = getDictionary(locale);
  const { start, end, fromKey, toKey } = resolveAdminDateRange(searchParams.from, searchParams.to);
  const [logs, auditLogs] = await Promise.all([
    getReservationLogs({ start, end, limit: 1000 }),
    getAuditLogs({ start, end, limit: 1000 }),
  ]);

  return (
    <div className="space-y-8">
      <AdminDateRangeFilter fromKey={fromKey} toKey={toKey} dict={dict} />

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.historySectionTitle}</h2>
        <AdminOperationHistory logs={logs} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.auditLogSectionTitle}</h2>
        <AdminAuditLog logs={auditLogs} />
      </section>
    </div>
  );
}
