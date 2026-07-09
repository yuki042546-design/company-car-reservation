"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Employee } from "@/lib/types";

interface SelfDeleteButtonProps {
  reservationId: string;
  ownerName: string;
}

// 一般社員向けの削除ボタン。管理者ログインなしで、予約した本人だけが
// 自分の予約を削除できるようにする（本人確認は「使用者名を選択する」
// という自己申告ベースの簡易的なもの。実際の可否判定はサーバー側
// （/api/reservations/[id] の DELETE）で employee_name と突き合わせて行う）。
export function SelfDeleteButton({ reservationId, ownerName }: SelfDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setError(null);
    setOpen(true);
    if (employees) return;

    setLoadingEmployees(true);
    try {
      const res = await fetch("/api/employees");
      const json = await res.json();
      let list: Employee[] = json.employees ?? [];
      if (!list.some((e) => e.name === ownerName)) {
        list = [
          { id: "owner", name: ownerName, department: null, age: null, isActive: true, createdAt: "" },
          ...list,
        ];
      }
      setEmployees(list);
    } catch {
      setError("社員一覧の取得に失敗しました。");
    } finally {
      setLoadingEmployees(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setRequesterName("");
    setError(null);
  }

  async function handleConfirmDelete() {
    if (!requesterName) {
      setError("あなたの名前を選択してください。");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? "削除に失敗しました。");
        return;
      }
      setOpen(false);
      setRequesterName("");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="rounded-lg border border-danger-border bg-danger-soft px-3 py-1.5 text-sm text-danger hover:bg-danger-soft/70"
      >
        削除
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 max-w-[80vw] rounded-xl border border-danger-border bg-danger-soft p-3 text-sm shadow-lg">
          <p className="mb-2 font-medium text-gray-700">本人確認: あなたの名前を選択</p>
          {error && <p className="mb-2 text-xs text-danger">{error}</p>}
          <select
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
            disabled={loadingEmployees}
            className="mb-2 w-full rounded-lg border border-gray-300 px-2 py-2"
          >
            <option value="">{loadingEmployees ? "読み込み中..." : "選択してください"}</option>
            {employees?.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmDelete}
              disabled={submitting || !requesterName}
              className="flex-1 rounded-lg bg-danger py-2 text-xs font-semibold text-white hover:bg-danger-hover disabled:opacity-50"
            >
              {submitting ? "削除中..." : "削除する"}
            </button>
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-300 bg-white py-2 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">※ご本人以外の予約は削除できません（管理者にご依頼ください）。</p>
        </div>
      )}
    </div>
  );
}
