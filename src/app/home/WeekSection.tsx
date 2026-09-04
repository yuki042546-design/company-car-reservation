import { getThisWeekReservations } from "@/lib/data";
import { getThisWeekRangeJst } from "@/lib/dateUtils";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveVehicles } from "@/lib/vehicles";
import { WeekReservations } from "@/components/WeekReservations";

// 「今週の予約」表示。独自にデータを取得し、他のセクションを待たずに
// ストリーミング表示できるようにしている。
export async function WeekSection() {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const { start: weekStart } = getThisWeekRangeJst();
  const [week, vehicles] = await Promise.all([getThisWeekReservations(), getActiveVehicles()]);
  const vehicleNames =
    vehicles.length > 1 ? Object.fromEntries(vehicles.map((v) => [v.id, v.name])) : undefined;

  return (
    <WeekReservations
      reservations={week}
      weekStartIso={weekStart.toISOString()}
      locale={locale}
      dict={dict}
      vehicleNames={vehicleNames}
    />
  );
}
