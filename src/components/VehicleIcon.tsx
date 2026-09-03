import type { VehicleType } from "@/lib/types";

// 車種ごとに形・色が異なるシンプルな側面シルエットアイコン。サーバー・クライアント
// どちらのコンポーネントからも使えるよう、"use client" は付けていない。
export const VEHICLE_TYPES: VehicleType[] = ["sedan", "wagon", "kei", "van", "truck"];

interface VehicleIconProps {
  type: VehicleType | null;
  className?: string;
}

export function VehicleIcon({ type, className = "h-8 w-8" }: VehicleIconProps) {
  switch (type) {
    case "sedan":
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          <path
            d="M6 28 L10 16 Q14 10 22 10 L38 10 Q46 10 50 16 L58 28 L58 30 L6 30 Z"
            fill="#2563eb"
          />
          <path d="M16 16 Q19 12 24 12 L36 12 Q41 12 44 16 L44 18 L16 18 Z" fill="#bfdbfe" />
          <circle cx="18" cy="30" r="5" fill="#1f2937" />
          <circle cx="46" cy="30" r="5" fill="#1f2937" />
        </svg>
      );
    case "wagon":
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          <path
            d="M6 28 L8 15 Q10 10 18 10 L44 10 Q52 10 54 16 L58 28 L58 30 L6 30 Z"
            fill="#16a34a"
          />
          <path d="M14 16 Q16 12 20 12 L42 12 Q47 12 49 16 L49 18 L14 18 Z" fill="#bbf7d0" />
          <circle cx="17" cy="30" r="5" fill="#1f2937" />
          <circle cx="47" cy="30" r="5" fill="#1f2937" />
        </svg>
      );
    case "kei":
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          <path
            d="M12 28 L13 17 Q14 12 20 12 L42 12 Q48 12 49 17 L50 28 L50 30 L12 30 Z"
            fill="#f59e0b"
          />
          <path d="M18 17 Q19 14 22 14 L40 14 Q43 14 44 17 L44 19 L18 19 Z" fill="#fef3c7" />
          <circle cx="20" cy="30" r="5" fill="#1f2937" />
          <circle cx="42" cy="30" r="5" fill="#1f2937" />
        </svg>
      );
    case "van":
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          <path d="M6 28 L7 12 Q7 9 10 9 L52 9 Q56 9 57 15 L58 28 L58 30 L6 30 Z" fill="#7c3aed" />
          <path d="M12 12 L12 18 L20 18 L20 12 Z" fill="#ede9fe" />
          <circle cx="17" cy="30" r="5" fill="#1f2937" />
          <circle cx="47" cy="30" r="5" fill="#1f2937" />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          <path d="M4 20 L30 20 L30 28 L30 30 L4 30 Z" fill="#57534e" />
          <path d="M32 12 L46 12 Q50 12 52 16 L58 22 L58 28 L32 28 Z" fill="#78716c" />
          <path d="M35 14 L44 14 Q46 14 47 16 L49 20 L35 20 Z" fill="#e7e5e4" />
          <circle cx="14" cy="30" r="5" fill="#1f2937" />
          <circle cx="48" cy="30" r="5" fill="#1f2937" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          <path
            d="M6 28 L10 17 Q13 11 21 11 L39 11 Q47 11 50 17 L58 28 L58 30 L6 30 Z"
            fill="#9ca3af"
          />
          <path d="M17 17 Q19 13 23 13 L37 13 Q41 13 43 17 L43 19 L17 19 Z" fill="#e5e7eb" />
          <circle cx="18" cy="30" r="5" fill="#1f2937" />
          <circle cx="46" cy="30" r="5" fill="#1f2937" />
        </svg>
      );
  }
}
