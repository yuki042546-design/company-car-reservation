import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { getAllVehicles } from "@/lib/vehicles";
import { AdminVehicleManager } from "@/components/AdminVehicleManager";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  if (!isAdminRequest()) return null;

  const dict = getDictionary(getLocale());
  const vehicles = await getAllVehicles();

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.vehiclesSectionTitle}</h2>
      <AdminVehicleManager vehicles={vehicles} />
    </section>
  );
}
