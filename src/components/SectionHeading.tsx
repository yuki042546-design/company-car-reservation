import type { ReactNode } from "react";

type SectionColor = "brand" | "amber" | "teal";

interface SectionHeadingProps {
  icon: ReactNode;
  color: SectionColor;
  title: string;
  right?: ReactNode;
}

const COLOR_CLASSES: Record<SectionColor, string> = {
  brand: "bg-brand-50 text-brand-600",
  amber: "bg-amber-50 text-amber-600",
  teal: "bg-teal-50 text-teal-600",
};

// 3つの主要セクション（予定・今日の予約・今週の予約）を色分けし、
// 同じ見た目のカードが並んで見分けにくくなるのを防ぐための共通見出し。
export function SectionHeading({ icon, color, title, right }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${COLOR_CLASSES[color]}`}>
          {icon}
        </span>
        <h2 className="truncate text-lg font-bold tracking-tight text-gray-900">{title}</h2>
      </div>
      {right}
    </div>
  );
}
