"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Employee, Reservation } from "@/lib/types";
import { datetimeLocalToIso, isoToDatetimeLocal, nextSlotDatetimeLocal } from "@/lib/dateUtils";
import { validateReservationInput } from "@/lib/reservationRules";
import { DateTimeSelect } from "./DateTimeSelect";
import { EmployeeCombobox } from "./EmployeeCombobox";

interface ReservationFormProps {
  employees: Employee[];
  mode: "create" | "edit";
  reservationId?: string;
  initial?: Reservation | null;
}

function defaultStart(): string {
  return nextSlotDatetimeLocal();
}

function defaultEnd(startValue: string): string {
  const start = new Date(startValue);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return isoToDatetimeLocal(end.toISOString());
}

export function ReservationForm({ employees, mode, reservationId, initial }: ReservationFormProps) {
  const router = useRouter();

  // 編集対象の予約が、すでに無効化された社員のものである場合も
  // プルダウン／検索候補に表示できるようにしておく（選択自体は変更可能）。
  const employeeOptions = useMemo(() => {
    if (initial && !employees.some((emp) => emp.name === initial.employeeName)) {
      return [
        {
          id: "initial-employee",
          name: initial.employeeName,
          department: null,
          age: null,
          isActive: true,
          createdAt: "",
        },
        ...employees,
      ];
    }
    return employees;
  }, [employees, initial]);

  const [employeeName, setEmployeeName] = useState(initial?.employeeName ?? employees[0]?.name ?? "");
  const [startTime, setStartTime] = useState(
    initial ? isoToDatetimeLocal(initial.startTime) : defaultStart()
  );
  const [endTime, setEndTime] = useState(
    initial ? isoToDatetimeLocal(initial.endTime) : defaultEnd(defaultStart())
  );
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    if (!employeeOptions.some((emp) => emp.name === employeeName)) {
      setErrors(["使用者名は候補一覧から選択してください。"]);
      return;
    }

    const input = {
      employeeName,
      startTime: datetimeLocalToIso(startTime),
      endTime: datetimeLocalToIso(endTime),
      destination,
      purpose,
      note: note || null,
    };

    const validation = validateReservationInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/reservations" : `/api/reservations/${reservationId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrors(json.errors ?? ["登録に失敗しました。"]);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrors(["通信エラーが発生しました。時間をおいて再度お試しください。"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <ul className="list-inside list-disc space-y-1">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="employeeName">
          使用者名 <span className="text-red-500">*</span>
        </label>
        {employeeOptions.length === 0 ? (
          <p className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
            社員が登録されていません
          </p>
        ) : (
          <EmployeeCombobox
            id="employeeName"
            employees={employeeOptions}
            value={employeeName}
            onChange={setEmployeeName}
            required
          />
        )}
      </div>

      <DateTimeSelect
        id="startTime"
        label="開始日時"
        value={startTime}
        onChange={setStartTime}
        required
      />

      <DateTimeSelect
        id="endTime"
        label="終了日時"
        value={endTime}
        onChange={setEndTime}
        required
        helperText="30分単位・最短30分〜最大4時間で指定してください。"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="destination">
          行き先 <span className="text-red-500">*</span>
        </label>
        <input
          id="destination"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="例: 〇〇商事 本社"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="purpose">
          用途 <span className="text-red-500">*</span>
        </label>
        <input
          id="purpose"
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="例: 打ち合わせ"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="note">
          備考
        </label>
        <textarea
          id="note"
          value={note ?? ""}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-600 py-3.5 text-base font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? "登録中..." : mode === "create" ? "予約を登録する" : "変更を保存する"}
      </button>
    </form>
  );
}
