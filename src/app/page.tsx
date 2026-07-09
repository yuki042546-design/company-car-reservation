import Link from "next/link";
import { getThisWeekReservations, getTodayReservations } from "@/lib/data";
import { getThisWeekRangeJst, getTodayRangeJst } from "@/lib/dateUtils";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { TodayView } from "@/components/TodayView";
import { WeekReservations } from "@/components/WeekReservations";

export const dynamic = "force-dynamic";

export default async function TopPage() {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const [today, week] = await Promise.all([getTodayReservations(), getThisWeekReservations()]);
  const { start: weekStart } = getThisWeekRangeJst();
  const { start: todayStart } = getTodayRangeJst();

  return (
    <div className="space-y-8">
      <Link
        href="/reservations/new"
        className="block w-full rounded-lg bg-brand-600 py-4 text-center text-lg font-bold text-white shadow-md hover:bg-brand-700"
      >
        {dict.top.newReservation}
      </Link>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.top.todayTitle}</h2>
        <TodayView reservations={today} todayStartIso={todayStart.toISOString()} nowIso={new Date().toISOString()} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-gray-900">{dict.top.weekTitle}</h2>
          <Link href="/reservations" className="text-sm text-brand-600 hover:underline">
            {dict.top.allReservationsLink}
          </Link>
        </div>
        <WeekReservations reservations={week} weekStartIso={weekStart.toISOString()} locale={locale} dict={dict} />
      </section>
    </div>
  );
}
