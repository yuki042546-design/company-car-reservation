import type { ReactNode } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const dict = getDictionary(getLocale());

  if (!isAdminRequest()) {
    return (
      <div>
        <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">{dict.admin.pageTitle}</h1>
        <AdminLoginForm />
      </div>
    );
  }

  const tabs = [
    { href: "/admin/reservations", label: dict.admin.reservationsSectionTitle },
    { href: "/admin/employees", label: dict.admin.employeesSectionTitle },
    { href: "/admin/maintenance", label: dict.maintenance.sectionTitle },
    { href: "/admin/usage-history", label: dict.admin.usageHistorySectionTitle },
    { href: "/admin/logs", label: dict.admin.logsSectionTitle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">{dict.admin.pageTitle}</h1>
        <AdminLogoutButton />
      </div>
      <AdminNav tabs={tabs} />
      <div>{children}</div>
    </div>
  );
}
