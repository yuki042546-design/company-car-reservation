"use client";

import { useState } from "react";
import type { Reservation } from "@/lib/types";
import { ReservationCard } from "./ReservationCard";
import { SelfDeleteButton } from "./SelfDeleteButton";
import { TodayGanttChart } from "./TodayGanttChart";

interface TodayViewProps {
  reservations: Reservation[];
  todayStartIso: string;
  nowIso: string;
}

type ViewMode = "list" | "gantt";

export function TodayView({ reservations, todayStartIso, nowIso }: TodayViewProps) {
  const [mode, setMode] = useState<ViewMode>("list");

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
        <button
          onClick={() => setMode("list")}
          className={
            mode === "list"
              ? "rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white"
              : "rounded-md px-3 py-1.5 text-gray-500 hover:text-gray-700"
          }
        >
          リスト
        </button>
        <button
          onClick={() => setMode("gantt")}
          className={
            mode === "gantt"
              ? "rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white"
              : "rounded-md px-3 py-1.5 text-gray-500 hover:text-gray-700"
          }
        >
          ガントチャート
        </button>
      </div>

      {mode === "list" ? (
        reservations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-400">
            本日の予約はありません。
          </p>
        ) : (
          <div className="space-y-2">
            {reservations.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                rightSlot={<SelfDeleteButton reservationId={r.id} ownerName={r.employeeName} />}
              />
            ))}
          </div>
        )
      ) : (
        <TodayGanttChart reservations={reservations} todayStartIso={todayStartIso} nowIso={nowIso} />
      )}
    </div>
  );
}
