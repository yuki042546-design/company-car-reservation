import Link from "next/link";
import { getReservationsInRange, getThisWeekReservations, getTodayReservations } from "@/lib/data";
import { getJstDateKey, getMonthRangeJst, getThisWeekRangeJst, getTodayRangeJst, shiftMonthKey } from "@/lib/dateUtils";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { TodayView } from "@/components/TodayView";
import { TopScheduleToggle } from "@/components/TopScheduleToggle";
import { WeekReservations } from "@/components/WeekReservations";

export const dynamic = "force-dynamic";

interface TopPageProps {
  searchParams: { month?: string };
}

export default async function TopPage({ searchParams }: TopPageProps) {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const now = new Date();
  const [today, week] = await Promise.all([getTodayReservations(), getThisWeekReservations()]);
  const { start: weekStart } = getThisWeekRangeJst();
  const { start: todayStart } = getTodayRangeJst();

  const { start: monthStart, end: monthEnd, monthKey } = getMonthRangeJst(searchParams.month);
  const monthReservations = await getReservationsInRange(monthStart, monthEnd);
  const reservationDateKeys = Array.from(new Set(monthReservations.map((r) => getJstDateKey(r.startTime))));

  return (
    <div className="space-y-8">
      <section>
        <TopScheduleToggle
          calendar={{
            monthKey,
            prevMonthKey: shiftMonthKey(monthKey, -1),
            nextMonthKey: shiftMonthKey(monthKey, 1),
            todayKey: getJstDateKey(now.toISOString()),
            reservationDateKeys,
          }}
          gantt={{ reservations: today, todayStartIso: todayStart.toISOString(), nowIso: now.toISOString() }}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">{dict.top.todayTitle}</h2>
        <TodayView reservations={today} dict={dict} locale={locale} />
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
