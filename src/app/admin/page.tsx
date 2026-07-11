import {
  getAllEmployees,
  getAllUsers,
  getAuditLogs,
  getMaintenanceBlocks,
  getRecentReservations,
  getReservationLogs,
} from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { requirePageRole } from "@/lib/auth";
import { getDefaultVehicle } from "@/lib/vehicles";
import { AdminAuditLog } from "@/components/AdminAuditLog";
import { AdminMaintenanceManager } from "@/components/AdminMaintenanceManager";
import { AdminOperationHistory } from "@/components/AdminOperationHistory";
import { AdminReservationList } from "@/components/AdminReservationList";
import { EmployeeManager } from "@/components/EmployeeManager";
import { LogoutButton } from "@/components/LogoutButton";
import { UserManager } from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // vehicle_manager 以上のみアクセス可能（未ログイン・権限不足はここでリダイレクトされる）。
  const currentUser = await requirePageRole("vehicle_manager");
  const locale = getLocale();
  const dict = getDictionary(locale);

  const [reservations, employees, logs, auditLogs, maintenanceBlocks, vehicle] = await Promise.all([
    getRecentReservations(),
    getAllEmployees(),
    getReservationLogs(),
    getAuditLogs(),
    getMaintenanceBlocks(),
    getDefaultVehicle(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">{dict.admin.pageTitle}</h1>
        <LogoutButton />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.reservationsSectionTitle}</h2>
        <AdminReservationList reservations={reservations} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.employeesSectionTitle}</h2>
        <EmployeeManager employees={employees} />
      </section>

      {vehicle && (
        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.maintenance.sectionTitle}</h2>
          <AdminMaintenanceManager vehicleId={vehicle.id} blocks={maintenanceBlocks} />
        </section>
      )}

      {currentUser.role === "system_admin" && (
        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.usersSectionTitle}</h2>
          <UserManager users={await getAllUsers()} />
        </section>
      )}

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
