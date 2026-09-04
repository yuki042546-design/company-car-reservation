import type { Dictionary } from "@/lib/i18n/dictionary";

interface AdminDateRangeFilterProps {
  fromKey: string;
  toKey: string;
  dict: Dictionary;
}

// GETフォームによる日付絞り込み。クライアント側の状態を持たず、送信すると
// ?from=...&to=... 付きでページ自体が再読み込みされ、サーバー側で範囲を絞って
// 再取得する（JSは不要）。
export function AdminDateRangeFilter({ fromKey, toKey, dict }: AdminDateRangeFilterProps) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        {dict.admin.dateRangeFromLabel}
        <input
          type="date"
          name="from"
          defaultValue={fromKey}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        {dict.admin.dateRangeToLabel}
        <input
          type="date"
          name="to"
          defaultValue={toKey}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        {dict.admin.dateRangeApply}
      </button>
      <p className="basis-full text-xs text-gray-400">{dict.admin.dateRangeNote}</p>
    </form>
  );
}
