import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import { formatMonthLabel, getWeekdayHeaderLabels } from "@/lib/dateUtils";

interface MonthCalendarProps {
  monthKey: string; // "YYYY-MM"
  prevMonthKey: string;
  nextMonthKey: string;
  todayKey: string; // "YYYY-MM-DD"
  reservationDateKeys: string[];
  dict: Dictionary;
  locale: Locale;
}

interface DayCell {
  day: number;
  dateKey: string;
}

function buildMonthCells(monthKey: string): (DayCell | null)[] {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(y!, m! - 1, 1)).getUTCDay(); // 0=Sun..6=Sat
  const leadingBlanks = (firstWeekday + 6) % 7; // 月曜始まりへのオフセット

  const cells: (DayCell | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, dateKey: `${monthKey}-${String(day).padStart(2, "0")}` });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function MonthCalendar({
  monthKey,
  prevMonthKey,
  nextMonthKey,
  todayKey,
  reservationDateKeys,
  dict,
  locale,
}: MonthCalendarProps) {
  const cells = buildMonthCells(monthKey);
  const weekdayLabels = getWeekdayHeaderLabels(locale);
  const reservationDateSet = new Set(reservationDateKeys);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-center text-sm text-gray-500">{dict.top.calendarHint}</p>

      <div className="mb-3 flex items-center justify-between">
        <Link
          href={`/?month=${prevMonthKey}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          aria-label={dict.top.prevMonth}
        >
          ←
        </Link>
        <h3 className="text-base font-bold tracking-tight text-gray-900">{formatMonthLabel(monthKey, locale)}</h3>
        <Link
          href={`/?month=${nextMonthKey}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          aria-label={dict.top.nextMonth}
        >
          →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;

          const isToday = cell.dateKey === todayKey;
          const isPast = cell.dateKey < todayKey;
          const hasReservation = reservationDateSet.has(cell.dateKey);

          if (isPast) {
            return (
              <div
                key={cell.dateKey}
                className="flex aspect-square flex-col items-center justify-center rounded-lg text-sm text-gray-300"
              >
                {cell.day}
              </div>
            );
          }

          return (
            <Link
              key={cell.dateKey}
              href={`/reservations/new?date=${cell.dateKey}`}
              className={
                isToday
                  ? "flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-brand-600 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  : "flex aspect-square flex-col items-center justify-center rounded-lg text-sm text-gray-700 hover:bg-brand-50"
              }
            >
              <span>{cell.day}</span>
              <span
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${hasReservation ? "bg-brand-500" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
