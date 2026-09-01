import { getRecentReservations } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { getAllVehicles } from "@/lib/vehicles";
import { AdminReservationList } from "@/components/AdminReservationList";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage() {
  if (!isAdminRequest()) return null;

  const dict = getDictionary(getLocale());
  const [reservations, vehicles] = await Promise.all([getRecentReservations(), getAllVehicles()]);
  const vehicleNames =
    vehicles.length > 1 ? Object.fromEntries(vehicles.map((v) => [v.id, v.name])) : undefined;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.reservationsSectionTitle}</h2>
      <AdminReservationList reservations={reservations} vehicleNames={vehicleNames} />
    </section>
  );
}
