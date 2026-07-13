"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Employee, Reservation } from "@/lib/types";
import {
  addMinutesToDatetimeLocal,
  combineDatetimeLocal,
  datetimeLocalToIso,
  isoToDatetimeLocal,
  minutesBetweenDatetimeLocal,
  nextSlotDatetimeLocal,
  splitDatetimeLocal,
  START_TIME_SLOT_OPTIONS,
} from "@/lib/dateUtils";
import { validateReservationInput } from "@/lib/reservationRules";
import { rememberEmployeeName } from "@/lib/lastEmployeeName";
import { DateTimeSelect } from "./DateTimeSelect";
import { DurationSelect, type DurationValue } from "./DurationSelect";
import { EmployeeCombobox } from "./EmployeeCombobox";
import { useI18n } from "./LocaleProvider";

// 「利用時間」プルダウンの選択肢（分）。これ以外の利用時間（管理者向けの
// 長時間利用や、移行前の変則的な予約の編集など）は「その他」で終了日時を直接指定する。
const PRESET_DURATION_MINUTES = [30, 60, 120, 180, 240];

function computeInitialDuration(startIso: string, endIso: string): DurationValue {
  const minutes = minutesBetweenDatetimeLocal(isoToDatetimeLocal(startIso), isoToDatetimeLocal(endIso));
  return PRESET_DURATION_MINUTES.includes(minutes) ? minutes : "custom";
}

function formatDatetimeLocalDisplay(value: string): string {
  const { date, time } = splitDatetimeLocal(value);
  const [, month, day] = date.split("-");
  return month && day ? `${Number(month)}/${Number(day)} ${time}` : value;
}

interface ReservationFormProps {
  employees: Employee[];
  mode: "create" | "edit";
  reservationId?: string;
  initial?: Reservation | null;
  /** カレンダーで日付をタップして遷移してきた場合の初期日付（"YYYY-MM-DD"） */
  initialDate?: string;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 開始日時プルダウンは8:00〜18:00のみのため、現在時刻がその範囲外の場合は
// 選択肢の範囲内（始業/終業時刻）にクランプする。
function clampToStartTimeRange(value: string): string {
  const { date, time } = splitDatetimeLocal(value);
  if (time < "08:00") return combineDatetimeLocal(date, "08:00");
  if (time > "18:00") return combineDatetimeLocal(date, "18:00");
  return value;
}

function defaultStart(initialDate?: string): string {
  const base = clampToStartTimeRange(nextSlotDatetimeLocal());
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

  // 開始日時プルダウンは8:00〜18:00のみだが、それ以外の時刻の既存予約（レガシー予約・
  // 管理者による変則的な予約）を編集する場合も、現在の値を選択肢に含めておく。
  const startTimeOptions = useMemo(() => {
    if (!initial) return START_TIME_SLOT_OPTIONS;
    const { time } = splitDatetimeLocal(isoToDatetimeLocal(initial.startTime));
    if (START_TIME_SLOT_OPTIONS.includes(time)) return START_TIME_SLOT_OPTIONS;
    return [...START_TIME_SLOT_OPTIONS, time].sort();
  }, [initial]);

  const [employeeName, setEmployeeName] = useState(initial?.employeeName ?? employees[0]?.name ?? "");
  const [startTime, setStartTime] = useState(
    initial ? isoToDatetimeLocal(initial.startTime) : defaultStart(initialDate)
  );
  const [duration, setDuration] = useState<DurationValue>(
    initial ? computeInitialDuration(initial.startTime, initial.endTime) : 60
  );
  const [customEndTime, setCustomEndTime] = useState(
    initial ? isoToDatetimeLocal(initial.endTime) : defaultEnd(defaultStart(initialDate))
  );
  const endTime = duration === "custom" ? customEndTime : addMinutesToDatetimeLocal(startTime, duration);
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

    // ログイン機能がないため、変更時は元の使用者名を本人確認として送る
    // （管理者は別途ログイン済みなので不要）。
    const payload = mode === "edit" ? { ...input, requesterName: initial?.employeeName } : input;

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/reservations" : `/api/reservations/${reservationId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrors(json.errors ?? [dict.form.genericError]);
        return;
      }

      rememberEmployeeName(employeeName);
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
        timeOptions={startTimeOptions}
        variant="large"
      />

      <DurationSelect
        id="duration"
        label={dict.form.durationLabel}
        value={duration}
        onChange={(next) => {
          if (next === "custom") {
            setCustomEndTime(endTime);
          }
          setDuration(next);
        }}
        options={PRESET_DURATION_MINUTES}
        customLabel={dict.form.durationCustom}
        required
      />

      {duration === "custom" ? (
        <DateTimeSelect
          id="endTime"
          label={dict.form.endTime}
          value={customEndTime}
          onChange={setCustomEndTime}
          required
          helperText={dict.form.durationHelp}
        />
      ) : (
        <p className="text-sm text-gray-600">
          {dict.form.expectedEndLabel}:{" "}
          <span className="font-semibold text-gray-900">{formatDatetimeLocalDisplay(endTime)}</span>
        </p>
      )}

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
