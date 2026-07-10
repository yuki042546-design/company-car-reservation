"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Employee, Reservation } from "@/lib/types";
import {
  combineDatetimeLocal,
  datetimeLocalToIso,
  isoToDatetimeLocal,
  nextSlotDatetimeLocal,
  splitDatetimeLocal,
} from "@/lib/dateUtils";
import { validateReservationInput } from "@/lib/reservationRules";
import { DateTimeSelect } from "./DateTimeSelect";
import { EmployeeCombobox } from "./EmployeeCombobox";
import { useI18n } from "./LocaleProvider";

interface ReservationFormProps {
  employees: Employee[];
  mode: "create" | "edit";
  reservationId?: string;
  initial?: Reservation | null;
  /** カレンダーで日付をタップして遷移してきた場合の初期日付（"YYYY-MM-DD"） */
  initialDate?: string;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function defaultStart(initialDate?: string): string {
  const base = nextSlotDatetimeLocal();
  if (initialDate && DATE_ONLY_PATTERN.test(initialDate)) {
    const { time } = splitDatetimeLocal(base);
    return combineDatetimeLocal(initialDate, time);
  }
  return base;
}

function defaultEnd(startValue: string): string {
  const start = new Date(startValue);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return isoToDatetimeLocal(end.toISOString());
}

export function ReservationForm({ employees, mode, reservationId, initial, initialDate }: ReservationFormProps) {
  const { dict } = useI18n();
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
    initial ? isoToDatetimeLocal(initial.startTime) : defaultStart(initialDate)
  );
  const [endTime, setEndTime] = useState(
    initial ? isoToDatetimeLocal(initial.endTime) : defaultEnd(defaultStart(initialDate))
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
      setErrors([dict.form.mustSelectFromList]);
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

    const validation = validateReservationInput(input, dict);
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
        setErrors(json.errors ?? [dict.form.genericError]);
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setErrors([dict.form.networkError]);
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
          {dict.form.employeeName} <span className="text-red-500">*</span>
        </label>
        {employeeOptions.length === 0 ? (
          <p className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
            {dict.form.noEmployeesRegistered}
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
        label={dict.form.startTime}
        value={startTime}
        onChange={setStartTime}
        required
      />

      <DateTimeSelect
        id="endTime"
        label={dict.form.endTime}
        value={endTime}
        onChange={setEndTime}
        required
        helperText={dict.form.durationHelp}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="destination">
          {dict.form.destination} <span className="text-red-500">*</span>
        </label>
        <input
          id="destination"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={dict.form.destinationPlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="purpose">
          {dict.form.purpose} <span className="text-red-500">*</span>
        </label>
        <input
          id="purpose"
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder={dict.form.purposePlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="note">
          {dict.form.note}
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
        {submitting
          ? dict.form.submitCreating
          : mode === "create"
            ? dict.form.submitCreate
            : dict.form.submitEdit}
      </button>
    </form>
  );
}
