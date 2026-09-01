import Link from "next/link";
import { getMaintenanceBlocks } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { getActiveVehicles } from "@/lib/vehicles";
import { AdminMaintenanceManager } from "@/components/AdminMaintenanceManager";

export const dynamic = "force-dynamic";

interface AdminMaintenancePageProps {
  searchParams: { vehicleId?: string };
}

export default async function AdminMaintenancePage({ searchParams }: AdminMaintenancePageProps) {
  if (!isAdminRequest()) return null;

  const dict = getDictionary(getLocale());
  const vehicles = await getActiveVehicles();
  const selectedVehicle =
    vehicles.find((v) => v.id === searchParams.vehicleId) ?? vehicles[0] ?? null;
  const maintenanceBlocks = selectedVehicle ? await getMaintenanceBlocks(selectedVehicle.id) : [];

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.maintenance.sectionTitle}</h2>

      {vehicles.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/admin/maintenance?vehicleId=${v.id}`}
              className={
                v.id === selectedVehicle?.id
                  ? "rounded-full bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              }
            >
              {v.name}
            </Link>
          ))}
        </div>
      )}

      {selectedVehicle ? (
        <AdminMaintenanceManager vehicleId={selectedVehicle.id} blocks={maintenanceBlocks} />
      ) : (
        <p className="text-sm text-gray-500">{dict.maintenance.noBlocks}</p>
      )}
    </section>
  );
}
