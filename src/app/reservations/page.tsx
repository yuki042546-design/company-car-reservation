import { getAllReservations } from "@/lib/data";
import { formatDateJa, isSameJstDate } from "@/lib/dateUtils";
import { ReservationCard } from "@/components/ReservationCard";
import { SelfDeleteButton } from "@/components/SelfDeleteButton";

export const dynamic = "force-dynamic";

export default async function AllReservationsPage() {
  const reservations = await getAllReservations();

  // 日付ごとにグループ化して表示する
  const groups: { dateIso: string; items: typeof reservations }[] = [];
  for (const r of reservations) {
    const group = groups.find((g) => isSameJstDate(g.dateIso, r.startTime));
    if (group) {
      group.items.push(r);
    } else {
      groups.push({ dateIso: r.startTime, items: [r] });
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">全予約一覧</h1>
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-400">
          予約はまだありません。
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.dateIso}>
              <h3 className="mb-2 text-sm font-semibold text-gray-500">{formatDateJa(g.dateIso)}</h3>
              <div className="space-y-2">
                {g.items.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    rightSlot={<SelfDeleteButton reservationId={r.id} ownerName={r.employeeName} />}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
