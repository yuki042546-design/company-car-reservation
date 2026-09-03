"use client";

import { useRouter } from "next/navigation";
import type { Employee } from "@/lib/types";
import { rememberEmployeeName } from "@/lib/lastEmployeeName";
import { useI18n } from "./LocaleProvider";

interface SelfTabNameSwitcherProps {
  employees: Employee[];
  currentName: string;
}

// 「自分の予約」タブの一番上に常時表示するプルダウン。共用端末などで別の利用者の
// 名前（ブラウザに記憶されたもの）が呼び出されてしまった場合に、選び直せるようにする。
export function SelfTabNameSwitcher({ employees, currentName }: SelfTabNameSwitcherProps) {
  const { dict } = useI18n();
  const router = useRouter();

  // 現在の名前が候補に無い場合（無効化された社員など）も選択肢に含めておく。
  const options = employees.some((e) => e.name === currentName)
    ? employees
    : [{ id: "current", name: currentName, department: null, age: null, isActive: true, createdAt: "" }, ...employees];

  function handleChange(name: string) {
    if (!name || name === currentName) return;
    rememberEmployeeName(name);
    router.replace(`/reservations?tab=self&name=${encodeURIComponent(name)}`);
  }

  return (
    <div className="mb-3 flex items-center gap-2 text-sm">
      <label className="text-gray-500" htmlFor="selfTabNameSwitcher">
        {dict.reservationsPage.selfTabNameLabel}
      </label>
      <select
        id="selfTabNameSwitcher"
        value={currentName}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
      >
        {options.map((emp) => (
          <option key={emp.id} value={emp.name}>
            {emp.name}
          </option>
        ))}
      </select>
    </div>
  );
}
