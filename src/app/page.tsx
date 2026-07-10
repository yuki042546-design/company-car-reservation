import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const dynamic = "force-dynamic";

export default function CoverPage() {
  const dict = getDictionary(getLocale());

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
      <div>
        <p className="text-2xl font-bold tracking-tight text-gray-900">豊桑産業</p>
        <p className="mt-1 text-lg font-semibold tracking-tight text-gray-600">Car-Reservation System</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/home"
          className="rounded-lg bg-brand-600 py-3.5 text-center text-base font-semibold text-white shadow hover:bg-brand-700"
        >
          {dict.cover.tabReservation}
        </Link>
        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 bg-white py-3.5 text-center text-base font-semibold text-gray-700 hover:bg-gray-50"
        >
          {dict.cover.tabAdmin}
        </Link>
        <Link
          href="/guide"
          className="rounded-lg border border-gray-300 bg-white py-3.5 text-center text-base font-semibold text-gray-700 hover:bg-gray-50"
        >
          {dict.cover.tabGuide}
        </Link>
      </div>
    </div>
  );
}
