import { getUsageHistory } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { AdminUsageHistory } from "@/components/AdminUsageHistory";

export const dynamic = "force-dynamic";

export default async function AdminUsageHistoryPage() {
  if (!isAdminRequest()) return null;

  const locale = getLocale();
  const dict = getDictionary(locale);
  const usageHistory = await getUsageHistory();

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.usageHistorySectionTitle}</h2>
      <AdminUsageHistory entries={usageHistory} dict={dict} locale={locale} />
    </section>
  );
}
