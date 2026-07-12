"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Employee } from "@/lib/types";
import { LAST_EMPLOYEE_NAME_KEY } from "@/lib/lastEmployeeName";
import { useI18n } from "./LocaleProvider";

// ログイン機能がないため、「自分の予約」タブはブラウザに記憶した名前
// （lastEmployeeName）で絞り込む。まだ記憶されていなければ、名前を選んで
// もらい、その後は自動でこのタブに反映されるようにする。
export function SelfTabNamePicker() {
  const { dict } = useI18n();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const remembered = window.localStorage.getItem(LAST_EMPLOYEE_NAME_KEY);
    if (remembered) {
      router.replace(`/reservations?tab=self&name=${encodeURIComponent(remembered)}`);
      return;
    }
    fetch("/api/employees")
      .then((res) => res.json())
      .then((json) => setEmployees(json.employees ?? []))
      .catch(() => setError(dict.reservationsPage.selfPickerFetchError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleConfirm() {
    if (!name) return;
    window.localStorage.setItem(LAST_EMPLOYEE_NAME_KEY, name);
    router.replace(`/reservations?tab=self&name=${encodeURIComponent(name)}`);
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm">
      <p className="mb-3 text-gray-600">{dict.reservationsPage.selfPickerPrompt}</p>
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
        >
          <option value="">{dict.common.selectPlaceholder}</option>
          {employees?.map((emp) => (
            <option key={emp.id} value={emp.name}>
              {emp.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleConfirm}
          disabled={!name}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {dict.reservationsPage.selfPickerButton}
        </button>
      </div>
    </div>
  );
}
