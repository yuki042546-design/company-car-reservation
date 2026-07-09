import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Reservation } from "@/lib/types";
import { formatTimeJa } from "@/lib/dateUtils";

interface ReservationCardProps {
  reservation: Reservation;
  dict: Dictionary;
  showEditLink?: boolean;
  rightSlot?: React.ReactNode;
}

export function ReservationCard({ reservation, dict, showEditLink = true, rightSlot }: ReservationCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-base font-semibold tabular-nums text-gray-900">
              {formatTimeJa(reservation.startTime)} 〜 {formatTimeJa(reservation.endTime)}
            </span>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-medium text-brand-600">
              {reservation.employeeName}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-gray-700">
            <span className="text-gray-500">{dict.reservationCard.destination}: </span>
            {reservation.destination}
          </p>
          <p className="truncate text-sm text-gray-700">
            <span className="text-gray-500">{dict.reservationCard.purpose}: </span>
            {reservation.purpose}
          </p>
          {reservation.note && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-500">
              {dict.reservationCard.note}: {reservation.note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {showEditLink && (
            <Link
              href={`/reservations/${reservation.id}/edit`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              {dict.reservationCard.change}
            </Link>
          )}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}
