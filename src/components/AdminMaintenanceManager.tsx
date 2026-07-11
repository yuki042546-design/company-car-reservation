"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MaintenanceBlock, MaintenanceType, Reservation } from "@/lib/types";
import { nextSlotDatetimeLocal, datetimeLocalToIso, formatDateTime } from "@/lib/dateUtils";
import { DateTimeSelect } from "./DateTimeSelect";
import { ReservationCard } from "./ReservationCard";
import { useI18n } from "./LocaleProvider";

interface AdminMaintenanceManagerProps {
  vehicleId: string;
  blocks: MaintenanceBlock[];
}

const MAINTENANCE_TYPES: MaintenanceType[] = ["inspection", "service", "repair", "tire_change", "cleaning", "other"];

export function AdminMaintenanceManager({ vehicleId, blocks }: AdminMaintenanceManagerProps) {
  const { dict, locale } = useI18n();
  const router = useRouter();

  const [startAt, setStartAt] = useState(nextSlotDatetimeLocal());
  const [endAt, setEndAt] = useState(nextSlotDatetimeLocal());
  const [type, setType] = useState<MaintenanceType>("inspection");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Reservation[]>([]);
  const [busyBlockId, setBusyBlockId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflicts([]);
    setAdding(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          startAt: datetimeLocalToIso(startAt),
          endAt: datetimeLocalToIso(endAt),
          type,
          reason: reason.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.maintenance.createError);
        if (json.conflictingReservations) {
          setConflicts(json.conflictingReservations);
        }
        return;
      }
      setReason("");
      router.refresh();
    } catch {
      setError(dict.maintenance.networkError);
    } finally {
      setAdding(false);
    }
  }

  async function handleCancelBlock(id: string) {
    if (!confirm(dict.maintenance.confirmCancel)) return;
    setBusyBlockId(id);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.maintenance.updateError);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.maintenance.networkError);
    } finally {
      setBusyBlockId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-danger-border bg-danger-soft p-2 text-sm text-danger">{error}</p>
      )}

      {conflicts.length > 0 && (
        <div className="space-y-2 rounded-lg border border-danger-border bg-danger-soft p-3">
          <p className="text-sm font-semibold text-danger">{dict.maintenance.conflictListTitle}</p>
          {conflicts.map((r) => (
            <ReservationCard key={r.id} reservation={r} dict={dict} locale={locale} showEditLink />
          ))}
        </div>
      )}

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {blocks.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">{dict.maintenance.noBlocks}</li>}
        {blocks.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-800">{dict.maintenance.typeLabels[b.type]}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {dict.maintenance.statusLabels[b.status]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-600">
                {formatDateTime(b.startAt, locale)} 〜 {formatDateTime(b.endAt, locale)}
              </p>
              {b.reason && <p className="mt-0.5 text-xs text-gray-400">{b.reason}</p>}
            </div>
            {(b.status === "scheduled" || b.status === "in_progress") && (
              <button
                onClick={() => handleCancelBlock(b.id)}
                disabled={busyBlockId === b.id}
                className="rounded-lg border border-danger-border bg-danger-soft px-3 py-1.5 text-xs text-danger hover:bg-danger-soft/70 disabled:opacity-50"
              >
                {dict.maintenance.cancelButton}
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
        <DateTimeSelect id="maint-start" label={dict.maintenance.startLabel} value={startAt} onChange={setStartAt} required />
        <DateTimeSelect id="maint-end" label={dict.maintenance.endLabel} value={endAt} onChange={setEndAt} required />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="maint-type">
            {dict.maintenance.typeLabel}
          </label>
          <select
            id="maint-type"
            value={type}
            onChange={(e) => setType(e.target.value as MaintenanceType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          >
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {dict.maintenance.typeLabels[t]}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={dict.maintenance.reasonPlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {adding ? dict.maintenance.adding : dict.maintenance.addButton}
        </button>
      </form>
    </div>
  );
}
