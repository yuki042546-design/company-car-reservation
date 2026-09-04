import { getRecentReservations } from "@/lib/data";
import { resolveAdminDateRange } from "@/lib/dateUtils";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { getAllVehicles } from "@/lib/vehicles";
import { AdminReservationList } from "@/components/AdminReservationList";

export const dynamic = "force-dynamic";

interface AdminReservationsPageProps {
  searchParams: { from?: string; to?: string };
}

export default async function AdminReservationsPage({ searchParams }: AdminReservationsPageProps) {
  if (!isAdminRequest()) return null;

  const dict = getDictionary(getLocale());
  const { start, end, fromKey, toKey } = resolveAdminDateRange(searchParams.from, searchParams.to);
  const [reservations, vehicles] = await Promise.all([
    getRecentReservations({ start, end, limit: 1000 }),
    getAllVehicles(),
  ]);
  const vehicleNames =
    vehicles.length > 1 ? Object.fromEntries(vehicles.map((v) => [v.id, v.name])) : undefined;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.admin.reservationsSectionTitle}</h2>
      <AdminReservationList
        reservations={reservations}
        vehicleNames={vehicleNames}
        fromKey={fromKey}
        toKey={toKey}
      />
    </section>
  );
}
