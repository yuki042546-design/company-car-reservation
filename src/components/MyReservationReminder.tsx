"use client";

import { useEffect, useState } from "react";
import type { Reservation } from "@/lib/types";
import { formatTimeJa } from "@/lib/dateUtils";
import { getRememberedEmployeeName } from "@/lib/lastEmployeeName";
import { useI18n } from "./LocaleProvider";

// ログイン機能が無いため、「この端末で最後に使われた名前」＝おそらく今それを
// 見ている本人、とみなして、その人が今まさに対応すべき予約（出発し忘れ・
// 返却し忘れ）だけをトップ画面で目立たせる。管理者への通知（Slack/Teams）とは
// 別に、本人自身にもその場で気づいてもらうための軽量なリマインドで、
// 新しい連絡先情報（メール等）は一切必要としない。
export function MyReservationReminder() {
  const { dict } = useI18n();
  const [needsDepart, setNeedsDepart] = useState<Reservation[]>([]);
  const [needsReturn, setNeedsReturn] = useState<Reservation[]>([]);
  const [vehicleNames, setVehicleNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const name = getRememberedEmployeeName();
    if (!name) return;

    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

    Promise.all([
      fetch(`/api/reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
    ])
      .then(([resJson, vehJson]) => {
        const reservations: Reservation[] = resJson.reservations ?? [];
        const mine = reservations.filter((r) => r.employeeName === name);
        setNeedsDepart(mine.filter((r) => r.status === "reserved" && new Date(r.startTime) <= now));
        setNeedsReturn(mine.filter((r) => (r.status === "in_use" || r.status === "overdue") && new Date(r.endTime) <= now));
        const names: Record<string, string> = {};
        for (const v of vehJson.vehicles ?? []) names[v.id] = v.name;
        setVehicleNames(names);
      })
      .catch(() => {
        // 本人向けの補助表示に過ぎないため、取得に失敗しても無視する（画面は通常表示のまま）。
      });
  }, []);

  if (needsDepart.length === 0 && needsReturn.length === 0) return null;

  return (
    <div className="space-y-2">
      {needsReturn.map((r) => (
        <p
          key={r.id}
          className="rounded-xl border border-danger-border bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger"
        >
          {dict.myReminder.overdueReturn(vehicleNames[r.vehicleId] ?? "", formatTimeJa(r.endTime))}
        </p>
      ))}
      {needsDepart.map((r) => (
        <p
          key={r.id}
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800"
        >
          {dict.myReminder.forgotDepart(vehicleNames[r.vehicleId] ?? "", formatTimeJa(r.startTime))}
        </p>
      ))}
    </div>
  );
}
