"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDate, getJstDateKey } from "@/lib/dateUtils";
import type { Reservation } from "@/lib/types";
import { useI18n } from "./LocaleProvider";
import { MonthCalendar } from "./MonthCalendar";
import { TodayGanttChart } from "./TodayGanttChart";

interface CalendarProps {
  monthKey: string;
  prevMonthKey: string;
  nextMonthKey: string;
  todayKey: string;
  /** 現在表示中の月の予約（日付ドットの表示と、選択日のガントチャート表示の両方に使う） */
  monthReservations: Reservation[];
}

interface GanttProps {
  todayReservations: Reservation[];
  todayStartIso: string;
  nowIso: string;
}

interface TopScheduleToggleProps {
  calendar: CalendarProps;
  gantt: GanttProps;
}

type Mode = "calendar" | "gantt";

export function TopScheduleToggle({ calendar, gantt }: TopScheduleToggleProps) {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("calendar");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const reservationDateKeys = useMemo(
    () => Array.from(new Set(calendar.monthReservations.map((r) => getJstDateKey(r.startTime)))),
    [calendar.monthReservations]
  );

  function handleDayTap(dateKey: string) {
    if (dateKey === selectedDateKey) {
      router.push(`/reservations/new?date=${dateKey}`);
    } else {
      setSelectedDateKey(dateKey);
    }
  }

  // 日付が選択されていなければ今日の予定を表示する（従来どおりの挙動）。
  const isTodaySelected = !selectedDateKey || selectedDateKey === calendar.todayKey;
  const ganttReservations = isTodaySelected
    ? gantt.todayReservations
    : calendar.monthReservations.filter((r) => getJstDateKey(r.startTime) === selectedDateKey);
  const ganttDayStartIso = isTodaySelected ? gantt.todayStartIso : `${selectedDateKey}T00:00:00+09:00`;

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
        <button
          onClick={() => setMode("calendar")}
          className={
            mode === "calendar"
              ? "rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white"
              : "rounded-md px-3 py-1.5 text-gray-500 hover:text-gray-700"
          }
        >
          {dict.top.viewCalendar}
        </button>
        <button
          onClick={() => setMode("gantt")}
          className={
            mode === "gantt"
              ? "rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white"
              : "rounded-md px-3 py-1.5 text-gray-500 hover:text-gray-700"
          }
        >
          {dict.top.viewGantt}
        </button>
      </div>

      {mode === "calendar" ? (
        <MonthCalendar
          monthKey={calendar.monthKey}
          prevMonthKey={calendar.prevMonthKey}
          nextMonthKey={calendar.nextMonthKey}
          todayKey={calendar.todayKey}
          reservationDateKeys={reservationDateKeys}
          selectedDateKey={selectedDateKey}
          onDayTap={handleDayTap}
          dict={dict}
          locale={locale}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">{formatDate(ganttDayStartIso, locale)}</p>
          <TodayGanttChart
            reservations={ganttReservations}
            dayStartIso={ganttDayStartIso}
            nowIso={gantt.nowIso}
            emptyMessage={isTodaySelected ? dict.top.noneToday : dict.top.noneThisDay}
            dict={dict}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}
