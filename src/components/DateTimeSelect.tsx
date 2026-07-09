"use client";

import { combineDatetimeLocal, isoToDatetimeLocal, splitDatetimeLocal, TIME_SLOT_OPTIONS } from "@/lib/dateUtils";

interface DateTimeSelectProps {
  id: string;
  label: string;
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  required?: boolean;
  helperText?: string;
}

function todayDateStr(): string {
  return splitDatetimeLocal(isoToDatetimeLocal(new Date().toISOString())).date;
}

// カレンダーによる日付選択 + 30分刻みのプルダウンによる時刻選択を組み合わせた入力。
// 内部的には ReservationForm が扱う datetime-local 形式 ("YYYY-MM-DDTHH:mm") の
// 文字列をそのまま入出力するため、既存の datetimeLocalToIso 等はそのまま使える。
export function DateTimeSelect({ id, label, value, onChange, required, helperText }: DateTimeSelectProps) {
  const { date, time } = splitDatetimeLocal(value);

  function handleDateChange(newDate: string) {
    onChange(combineDatetimeLocal(newDate, time || "00:00"));
  }

  function handleTimeChange(newTime: string) {
    onChange(combineDatetimeLocal(date, newTime));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={`${id}-date`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-date`}
          type="date"
          value={date}
          min={todayDateStr()}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-[58%] min-w-0 rounded-lg border border-gray-300 px-3 py-2.5"
          required={required}
        />
        <select
          id={`${id}-time`}
          aria-label={`${label} 時刻`}
          value={time}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="w-[42%] min-w-0 rounded-lg border border-gray-300 px-2 py-2.5"
          required={required}
        >
          {TIME_SLOT_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
    </div>
  );
}
