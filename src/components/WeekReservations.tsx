import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import type { Reservation } from "@/lib/types";
import { formatDate, isSameJstDate } from "@/lib/dateUtils";
import { ReservationCard } from "./ReservationCard";
import { SelfDeleteButton } from "./SelfDeleteButton";

interface WeekReservationsProps {
  reservations: Reservation[];
  weekStartIso: string;
  locale: Locale;
  dict: Dictionary;
}

export function WeekReservations({ reservations, weekStartIso, locale, dict }: WeekReservationsProps) {
  const weekStart = new Date(weekStartIso);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    return d.toISOString();
  });

  return (
    <div className="space-y-4">
      {days.map((dayIso) => {
        const dayReservations = reservations.filter((r) => isSameJstDate(r.startTime, dayIso));
        return (
          <div key={dayIso}>
            <h3 className="mb-2 text-sm font-semibold text-gray-500">{formatDate(dayIso, locale)}</h3>
            {dayReservations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
                {dict.top.noneThisDay}
              </p>
            ) : (
              <div className="space-y-2">
                {dayReservations.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    dict={dict}
                    rightSlot={<SelfDeleteButton reservationId={r.id} ownerName={r.employeeName} />}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
