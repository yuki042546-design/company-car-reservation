import Link from "next/link";
import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { FirstVisitGuideBanner } from "@/components/FirstVisitGuideBanner";
import { MyReservationReminder } from "@/components/MyReservationReminder";
import { SectionHeading } from "@/components/SectionHeading";
import { VehicleBannersSection } from "./VehicleBannersSection";
import { ScheduleSection } from "./ScheduleSection";
import { TodaySection } from "./TodaySection";
import { WeekSection } from "./WeekSection";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: { month?: string };
}

const iconStrokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-4 w-4",
  "aria-hidden": true,
};

function BlockSkeleton({ className = "h-24" }: { className?: string }) {
  return <div className={`${className} animate-pulse rounded-xl bg-gray-100`} />;
}

// トップ画面は表示する情報が多く、全部揃うのを待ってから一括で描画すると
// 体感の待ち時間が長くなる。各セクションを独立した非同期コンポーネントに分け、
// Suspense でそれぞれ包むことで、準備できたセクションから順に表示されるように
// している（Next.js のストリーミングSSR）。ページ自体は同期関数のままにして、
// 何もawaitせずに即座にシェル（見出し等）を返せるようにしてある。
export default function HomePage({ searchParams }: HomePageProps) {
  const dict = getDictionary(getLocale());

  return (
    <div className="space-y-8">
      <MyReservationReminder />
      <FirstVisitGuideBanner />

      <Suspense fallback={<BlockSkeleton className="h-28" />}>
        <VehicleBannersSection />
      </Suspense>

      <section>
        <SectionHeading
          color="brand"
          title={dict.top.scheduleTitle}
          icon={
            <svg viewBox="0 0 24 24" {...iconStrokeProps}>
              <rect x="3.5" y="5" width="17" height="15" rx="2" />
              <path d="M3.5 9.5h17" />
              <path d="M8 3v3M16 3v3" />
            </svg>
          }
        />
        <Suspense fallback={<BlockSkeleton className="h-64" />}>
          <ScheduleSection monthKeyParam={searchParams.month} />
        </Suspense>
      </section>

      <section>
        <SectionHeading
          color="amber"
          title={dict.top.todayTitle}
          icon={
            <svg viewBox="0 0 24 24" {...iconStrokeProps}>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          }
        />
        <Suspense fallback={<BlockSkeleton className="h-20" />}>
          <TodaySection />
        </Suspense>
      </section>

      <section>
        <SectionHeading
          color="teal"
          title={dict.top.weekTitle}
          icon={
            <svg viewBox="0 0 24 24" {...iconStrokeProps}>
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          }
          right={
            <Link href="/reservations" className="shrink-0 text-sm text-brand-600 hover:underline">
              {dict.top.allReservationsLink}
            </Link>
          }
        />
        <Suspense fallback={<BlockSkeleton className="h-40" />}>
          <WeekSection />
        </Suspense>
      </section>
    </div>
  );
}
