import { getReservationsInRange, getTodayReservations } from "@/lib/data";
import { getJstDateKey, getMonthRangeJst, getTodayRangeJst, shiftMonthKey } from "@/lib/dateUtils";
import { getActiveVehicles } from "@/lib/vehicles";
import { TopScheduleToggle } from "@/components/TopScheduleToggle";

interface ScheduleSectionProps {
  monthKeyParam?: string;
}

// カレンダー・時間割（ガントチャート）表示。独自にデータを取得し、他のセクション
// を待たずにストリーミング表示できるようにしている。
export async function ScheduleSection({ monthKeyParam }: ScheduleSectionProps) {
  const now = new Date();
  const { start: todayStart } = getTodayRangeJst();
  const { start: monthStart, end: monthEnd, monthKey } = getMonthRangeJst(monthKeyParam);

  const [monthReservations, today, vehicles] = await Promise.all([
    getReservationsInRange(monthStart, monthEnd),
    getTodayReservations(),
    getActiveVehicles(),
  ]);
  const vehicleNames =
    vehicles.length > 1 ? Object.fromEntries(vehicles.map((v) => [v.id, v.name])) : undefined;

  return (
    <TopScheduleToggle
      calendar={{
        monthKey,
        prevMonthKey: shiftMonthKey(monthKey, -1),
        nextMonthKey: shiftMonthKey(monthKey, 1),
        todayKey: getJstDateKey(now.toISOString()),
        monthReservations,
      }}
      gantt={{
        todayReservations: today,
        todayStartIso: todayStart.toISOString(),
        nowIso: now.toISOString(),
        vehicleNames,
      }}
    />
  );
}
