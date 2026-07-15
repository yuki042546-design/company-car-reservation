import { getMaintenanceBlocks } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { getDefaultVehicle } from "@/lib/vehicles";
import { AdminMaintenanceManager } from "@/components/AdminMaintenanceManager";

export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
  if (!isAdminRequest()) return null;

  const dict = getDictionary(getLocale());
  const [vehicle, maintenanceBlocks] = await Promise.all([getDefaultVehicle(), getMaintenanceBlocks()]);

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.maintenance.sectionTitle}</h2>
      {vehicle ? (
        <AdminMaintenanceManager vehicleId={vehicle.id} blocks={maintenanceBlocks} />
      ) : (
        <p className="text-sm text-gray-500">{dict.maintenance.noBlocks}</p>
      )}
    </section>
  );
}
