import { getAllEmployees } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { EmployeeManager } from "@/components/EmployeeManager";

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  if (!isAdminRequest()) return null;

  const dict = getDictionary(getLocale());
  const employees = await getAllEmployees();

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.employeesSectionTitle}</h2>
      <EmployeeManager employees={employees} />
    </section>
  );
}
