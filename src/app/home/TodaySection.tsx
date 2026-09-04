import { getTodayReservations } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveVehicles } from "@/lib/vehicles";
import { TodayView } from "@/components/TodayView";

// 「今日の予約」表示。独自にデータを取得し、他のセクションを待たずに
// ストリーミング表示できるようにしている。
export async function TodaySection() {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const [today, vehicles] = await Promise.all([getTodayReservations(), getActiveVehicles()]);
  const vehicleNames =
    vehicles.length > 1 ? Object.fromEntries(vehicles.map((v) => [v.id, v.name])) : undefined;

  return <TodayView reservations={today} dict={dict} locale={locale} vehicleNames={vehicleNames} />;
}
