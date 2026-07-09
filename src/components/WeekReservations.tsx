import type { Reservation } from "@/lib/types";
import { formatDateJa, isSameJstDate } from "@/lib/dateUtils";
import { ReservationCard } from "./ReservationCard";
import { SelfDeleteButton } from "./SelfDeleteButton";

interface WeekReservationsProps {
  reservations: Reservation[];
  weekStartIso: string;
}

export function WeekReservations({ reservations, weekStartIso }: WeekReservationsProps) {
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
            <h3 className="mb-2 text-sm font-semibold text-gray-500">{formatDateJa(dayIso)}</h3>
            {dayReservations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
                予約なし
              </p>
            ) : (
              <div className="space-y-2">
                {dayReservations.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
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
