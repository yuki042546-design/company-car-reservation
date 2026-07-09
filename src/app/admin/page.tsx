import { getAllEmployees, getAllReservations } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { AdminReservationList } from "@/components/AdminReservationList";
import { EmployeeManager } from "@/components/EmployeeManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = isAdminRequest();
  const dict = getDictionary(getLocale());

  if (!isAdmin) {
    return (
      <div>
        <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">{dict.admin.pageTitle}</h1>
        <AdminLoginForm />
      </div>
    );
  }

  const [reservations, employees] = await Promise.all([getAllReservations(), getAllEmployees()]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">{dict.admin.pageTitle}</h1>
        <AdminLogoutButton />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.reservationsSectionTitle}</h2>
        <AdminReservationList reservations={reservations} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.employeesSectionTitle}</h2>
        <EmployeeManager employees={employees} />
      </section>
    </div>
  );
}
