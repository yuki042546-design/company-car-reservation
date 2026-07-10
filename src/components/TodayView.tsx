import type { Reservation } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import { ReservationCard } from "./ReservationCard";
import { SelfDeleteButton } from "./SelfDeleteButton";

interface TodayViewProps {
  reservations: Reservation[];
  dict: Dictionary;
  locale: Locale;
}

export function TodayView({ reservations, dict, locale }: TodayViewProps) {
  if (reservations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-400">
        {dict.top.noneToday}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reservations.map((r) => (
        <ReservationCard
          key={r.id}
          reservation={r}
          dict={dict}
          locale={locale}
          rightSlot={<SelfDeleteButton reservationId={r.id} ownerName={r.employeeName} />}
        />
      ))}
    </div>
  );
}
