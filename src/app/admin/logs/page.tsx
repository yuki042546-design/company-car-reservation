import { getAuditLogs, getReservationLogs } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { AdminAuditLog } from "@/components/AdminAuditLog";
import { AdminOperationHistory } from "@/components/AdminOperationHistory";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  if (!isAdminRequest()) return null;

  const locale = getLocale();
  const dict = getDictionary(locale);
  const [logs, auditLogs] = await Promise.all([getReservationLogs(), getAuditLogs()]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.historySectionTitle}</h2>
        <AdminOperationHistory logs={logs} dict={dict} locale={locale} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.auditLogSectionTitle}</h2>
        <AdminAuditLog logs={auditLogs} dict={dict} locale={locale} />
      </section>
    </div>
  );
}
