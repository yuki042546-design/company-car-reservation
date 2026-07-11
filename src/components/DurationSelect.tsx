"use client";

export type DurationValue = number | "custom";

interface DurationSelectProps {
  id: string;
  label: string;
  value: DurationValue;
  onChange: (value: DurationValue) => void;
  options: number[]; // 分単位
  customLabel: string;
  required?: boolean;
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}時間` : `${minutes}分`;
}

// 開始時刻に対する「利用時間」プルダウン。終了時刻は呼び出し側で
// 開始時刻 + この値から自動計算する（「その他」選択時のみ終了時刻を直接指定する）。
export function DurationSelect({ id, label, value, onChange, options, customLabel, required }: DurationSelectProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value === "custom" ? "custom" : Number(e.target.value))}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
        required={required}
      >
        {options.map((minutes) => (
          <option key={minutes} value={minutes}>
            {formatDurationLabel(minutes)}
          </option>
        ))}
        <option value="custom">{customLabel}</option>
      </select>
    </div>
  );
}
