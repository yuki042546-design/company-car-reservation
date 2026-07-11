"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Reservation, ReservationStatus } from "@/lib/types";
import { useI18n } from "./LocaleProvider";
import { ReservationCard } from "./ReservationCard";

interface AdminReservationListProps {
  reservations: Reservation[];
}

const STATUS_OPTIONS: ReservationStatus[] = ["reserved", "in_use", "completed", "cancelled", "no_show", "overdue"];

export function AdminReservationList({ reservations }: AdminReservationListProps) {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");

  // 検索・絞り込みは直近N件（サーバー側でgetRecentReservationsにより上限済み）に対して
  // クライアント側で行う。利用者名・行き先・用途・予約IDのいずれかに一致すればヒットする。
  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const haystack = `${r.employeeName} ${r.destination} ${r.purpose} ${r.id}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [reservations, search, statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm(dict.admin.confirmDelete)) return;
    const reason = window.prompt(dict.admin.cancelReasonPrompt)?.trim();
    if (!reason) {
      setError(dict.admin.cancelReasonRequired);
      return;
    }
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: reason }),
      });
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
      prev.size === filtered.length && prev.size > 0 ? new Set() : new Set(filtered.map((r) => r.id))
    );
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(dict.admin.confirmBulkDelete(selectedIds.size))) return;
    const reason = window.prompt(dict.admin.cancelReasonPrompt)?.trim();
    if (!reason) {
      setError(dict.admin.cancelReasonRequired);
      return;
    }
    setError(null);
    setBulkDeleting(true);
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/reservations/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cancellationReason: reason }),
          })
        )
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

  const allSelected = selectedIds.size > 0 && selectedIds.size === filtered.length;

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg border border-danger-border bg-danger-soft p-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.admin.searchPlaceholder}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReservationStatus | "all")}
          className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
        >
          <option value="all">{dict.admin.statusFilterAll}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {dict.vehicleStatus.statusLabels[s]}
            </option>
          ))}
        </select>
      </div>

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

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-400">
          {dict.admin.noSearchResults}
        </p>
      ) : (
        filtered.map((r) => (
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
        ))
      )}
      <p className="pt-2 text-right text-xs text-gray-400">{dict.admin.countLabel(filtered.length)}</p>
    </div>
  );
}
