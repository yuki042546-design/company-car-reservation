"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Reservation } from "@/lib/types";
import { useI18n } from "./LocaleProvider";
import { ReservationCard } from "./ReservationCard";

interface AdminReservationListProps {
  reservations: Reservation[];
}

export function AdminReservationList({ reservations }: AdminReservationListProps) {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm(dict.admin.confirmDelete)) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.admin.deleteGenericError);
        return;
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    } catch {
      setError(dict.admin.networkError);
    } finally {
      setDeletingId(null);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === reservations.length ? new Set() : new Set(reservations.map((r) => r.id))
    );
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(dict.admin.confirmBulkDelete(selectedIds.size))) return;
    setError(null);
    setBulkDeleting(true);
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) => fetch(`/api/reservations/${id}`, { method: "DELETE" }))
      );
      const hasFailure = results.some((res) => !res.ok);
      if (hasFailure) {
        setError(dict.admin.bulkDeleteGenericError);
      }
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      setError(dict.admin.networkError);
    } finally {
      setBulkDeleting(false);
    }
  }

  if (reservations.length === 0) {
    return <p className="text-sm text-gray-500">{dict.admin.noReservations}</p>;
  }

  const allSelected = selectedIds.size > 0 && selectedIds.size === reservations.length;

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg border border-danger-border bg-danger-soft p-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300"
          />
          {allSelected ? dict.admin.deselectAll : dict.admin.selectAll}
        </label>
        <button
          onClick={handleBulkDelete}
          disabled={selectedIds.size === 0 || bulkDeleting}
          className="rounded-lg border border-danger-border bg-danger-soft px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger-soft/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {bulkDeleting ? dict.admin.bulkDeleteButtonBusy : dict.admin.bulkDeleteButton(selectedIds.size)}
        </button>
      </div>

      {reservations.map((r) => (
        <div key={r.id} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selectedIds.has(r.id)}
            onChange={() => toggleSelected(r.id)}
            aria-label={dict.admin.selectRowLabel}
            className="mt-4 h-4 w-4 shrink-0 rounded border-gray-300"
          />
          <div className="min-w-0 flex-1">
            <ReservationCard
              reservation={r}
              dict={dict}
              locale={locale}
              showEditLink
              rightSlot={
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  className="rounded-lg border border-danger-border bg-danger-soft px-3 py-1.5 text-sm text-danger hover:bg-danger-soft/70 disabled:opacity-50"
                >
                  {deletingId === r.id ? dict.common.deleting : dict.common.delete}
                </button>
              }
            />
          </div>
        </div>
      ))}
      <p className="pt-2 text-right text-xs text-gray-400">{dict.admin.countLabel(reservations.length)}</p>
    </div>
  );
}
