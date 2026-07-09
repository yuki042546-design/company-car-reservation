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
      router.refresh();
    } catch {
      setError(dict.admin.networkError);
    } finally {
      setDeletingId(null);
    }
  }

  if (reservations.length === 0) {
    return <p className="text-sm text-gray-500">{dict.admin.noReservations}</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg border border-danger-border bg-danger-soft p-2 text-sm text-danger">{error}</p>}
      {reservations.map((r) => (
        <ReservationCard
          key={r.id}
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
      ))}
      <p className="pt-2 text-right text-xs text-gray-400">{dict.admin.countLabel(reservations.length)}</p>
    </div>
  );
}
