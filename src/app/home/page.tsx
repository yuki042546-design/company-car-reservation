import Link from "next/link";
import { requirePageUser, roleAtLeast } from "@/lib/auth";
import {
  getCurrentUsageReservation,
  getNextReservation,
  getReservationsInRange,
  getThisWeekReservations,
  getTodayReservations,
} from "@/lib/data";
import { getJstDateKey, getMonthRangeJst, getThisWeekRangeJst, getTodayRangeJst, shiftMonthKey } from "@/lib/dateUtils";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDefaultVehicle } from "@/lib/vehicles";
import { SectionHeading } from "@/components/SectionHeading";
import { TodayView } from "@/components/TodayView";
import { TopScheduleToggle } from "@/components/TopScheduleToggle";
import { VehicleStatusBanner } from "@/components/VehicleStatusBanner";
import { WeekReservations } from "@/components/WeekReservations";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: { month?: string };
}

const iconStrokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-4 w-4",
  "aria-hidden": true,
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const currentUser = await requirePageUser();
  const locale = getLocale();
  const dict = getDictionary(locale);
  const now = new Date();
  const [today, week] = await Promise.all([getTodayReservations(), getThisWeekReservations()]);
  const { start: weekStart } = getThisWeekRangeJst();
  const { start: todayStart } = getTodayRangeJst();

  const { start: monthStart, end: monthEnd, monthKey } = getMonthRangeJst(searchParams.month);
  const monthReservations = await getReservationsInRange(monthStart, monthEnd);

  const vehicle = await getDefaultVehicle();
  const [currentUsage, nextReservation] = vehicle
    ? await Promise.all([getCurrentUsageReservation(vehicle.id), getNextReservation(vehicle.id, now)])
    : [null, null];

  return (
    <div className="space-y-8">
      {vehicle && (
        <VehicleStatusBanner
          vehicle={vehicle}
          currentUsage={currentUsage}
          nextReservation={nextReservation}
          currentUserId={currentUser.id}
          isManager={roleAtLeast(currentUser.role, "vehicle_manager")}
        />
      )}

      <section>
        <SectionHeading
          color="brand"
          title={dict.top.scheduleTitle}
          icon={
            <svg viewBox="0 0 24 24" {...iconStrokeProps}>
              <rect x="3.5" y="5" width="17" height="15" rx="2" />
              <path d="M3.5 9.5h17" />
              <path d="M8 3v3M16 3v3" />
            </svg>
          }
        />
        <TopScheduleToggle
          calendar={{
            monthKey,
            prevMonthKey: shiftMonthKey(monthKey, -1),
            nextMonthKey: shiftMonthKey(monthKey, 1),
            todayKey: getJstDateKey(now.toISOString()),
            monthReservations,
          }}
          gantt={{ todayReservations: today, todayStartIso: todayStart.toISOString(), nowIso: now.toISOString() }}
        />
      </section>

      <section>
        <SectionHeading
          color="amber"
          title={dict.top.todayTitle}
          icon={
            <svg viewBox="0 0 24 24" {...iconStrokeProps}>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          }
        />
        <TodayView reservations={today} dict={dict} locale={locale} />
      </section>

      <section>
        <SectionHeading
          color="teal"
          title={dict.top.weekTitle}
          icon={
            <svg viewBox="0 0 24 24" {...iconStrokeProps}>
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          }
          right={
            <Link href="/reservations" className="shrink-0 text-sm text-brand-600 hover:underline">
              {dict.top.allReservationsLink}
            </Link>
          }
        />
        <WeekReservations reservations={week} weekStartIso={weekStart.toISOString()} locale={locale} dict={dict} />
      </section>
    </div>
  );
}
