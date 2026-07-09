"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Reservation } from "@/lib/types";
import { ReservationCard } from "./ReservationCard";

interface AdminReservationListProps {
  reservations: Reservation[];
}

export function AdminReservationList({ reservations }: AdminReservationListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("この予約を削除します。よろしいですか？")) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setDeletingId(null);
    }
  }

  if (reservations.length === 0) {
    return <p className="text-sm text-gray-500">予約はまだありません。</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg border border-danger-border bg-danger-soft p-2 text-sm text-danger">{error}</p>}
      {reservations.map((r) => (
        <ReservationCard
          key={r.id}
          reservation={r}
          showEditLink
          rightSlot={
            <button
              onClick={() => handleDelete(r.id)}
              disabled={deletingId === r.id}
              className="rounded-lg border border-danger-border bg-danger-soft px-3 py-1.5 text-sm text-danger hover:bg-danger-soft/70 disabled:opacity-50"
            >
              {deletingId === r.id ? "削除中..." : "削除"}
            </button>
          }
        />
      ))}
      <p className="pt-2 text-right text-xs text-gray-400">表示件数: {reservations.length}件</p>
    </div>
  );
}
