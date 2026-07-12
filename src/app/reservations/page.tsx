import Link from "next/link";
import { getFilteredReservations, type ReservationListTab } from "@/lib/data";
import { formatDate, isSameJstDate } from "@/lib/dateUtils";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { ReservationCard } from "@/components/ReservationCard";
import { SelfDeleteButton } from "@/components/SelfDeleteButton";
import { SelfTabNamePicker } from "@/components/SelfTabNamePicker";

export const dynamic = "force-dynamic";

const TABS: ReservationListTab[] = ["self", "today", "upcoming", "in_use", "past", "cancelled"];

interface AllReservationsPageProps {
  searchParams: { tab?: string; page?: string; name?: string };
}

function isValidTab(value: string | undefined): value is ReservationListTab {
  return !!value && (TABS as string[]).includes(value);
}

export default async function AllReservationsPage({ searchParams }: AllReservationsPageProps) {
  const locale = getLocale();
  const dict = getDictionary(locale);

  // 通常社員の初期表示は「自分の予約」。他のタブへはヘッダー下のタブから切り替える。
  const tab: ReservationListTab = isValidTab(searchParams.tab) ? searchParams.tab : "self";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const employeeName = searchParams.name?.trim() || undefined;

  const { reservations, hasMore } = await getFilteredReservations({
    tab,
    employeeName,
    page,
  });

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
      <h1 className="mb-4 text-xl font-bold tracking-tight text-gray-900">{dict.reservationsPage.title}</h1>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/reservations?tab=${t}`}
            className={
              t === tab
                ? "rounded-full bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            }
          >
            {dict.reservationsPage.tabs[t]}
          </Link>
        ))}
      </div>

      {tab === "self" && !employeeName ? (
        <SelfTabNamePicker />
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-400">
          {dict.reservationsPage.empty}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.dateIso}>
              <h3 className="mb-2 text-sm font-semibold text-gray-500">{formatDate(g.dateIso, locale)}</h3>
              <div className="space-y-2">
                {g.items.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    dict={dict}
                    locale={locale}
                    rightSlot={<SelfDeleteButton reservationId={r.id} ownerName={r.employeeName} />}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-6 text-center">
          <Link
            href={`/reservations?tab=${tab}&page=${page + 1}${employeeName ? `&name=${encodeURIComponent(employeeName)}` : ""}`}
            className="inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {dict.reservationsPage.loadMore}
          </Link>
        </div>
      )}
    </div>
  );
}
