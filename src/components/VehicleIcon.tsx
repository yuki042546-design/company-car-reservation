import type { VehicleType } from "@/lib/types";

// 実際の車両写真（public/vehicle-icons/fleet-photos.webp、1536x1024の2x2グリッド、
// 1マスあたり768x512 = 縦横比3:2）から、CSSのbackground-position/sizeで
// 車種ごとに1枚分だけを切り出して表示する。サーバー・クライアントどちらの
// コンポーネントからも使えるよう "use client" は付けていない。
export const VEHICLE_TYPES: VehicleType[] = ["hiace", "prius", "eqs", "kei"];

// 画像内の位置（左上=ハイエース、右上=プリウス、左下=EQS、右下=軽自動車）。
const POSITION_BY_TYPE: Record<VehicleType, string> = {
  hiace: "0% 0%",
  prius: "100% 0%",
  eqs: "0% 100%",
  kei: "100% 100%",
};

interface VehicleIconProps {
  type: VehicleType | null;
  className?: string;
}

export function VehicleIcon({ type, className = "w-24" }: VehicleIconProps) {
  if (!type) {
    return (
      <div
        className={`${className} flex aspect-[3/2] shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300`}
      >
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="13" width="18" height="5" rx="1.5" />
          <circle cx="7.5" cy="18.5" r="1.5" />
          <circle cx="16.5" cy="18.5" r="1.5" />
        </svg>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={type}
      className={`${className} aspect-[3/2] shrink-0 overflow-hidden rounded-lg bg-white`}
      style={{
        backgroundImage: "url(/vehicle-icons/fleet-photos.webp)",
        backgroundSize: "200% 200%",
        backgroundPosition: POSITION_BY_TYPE[type],
      }}
    />
  );
}
