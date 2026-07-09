import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Reservation } from "@/lib/types";
import { formatTimeJa } from "@/lib/dateUtils";

interface TodayGanttChartProps {
  reservations: Reservation[];
  /** 今日(JST)の 00:00 を表す ISO 文字列。時間軸の基準点として使う。 */
  todayStartIso: string;
  /** 現在時刻の ISO 文字列。「現在」ラインの表示に使う。 */
  nowIso: string;
  dict: Dictionary;
}

const PX_PER_HOUR = 60;
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 22;
const MIN_BLOCK_WIDTH = 112;
const LANE_HEIGHT = 56;
const LANE_GAP_PX = 6;

function hoursSinceMidnight(todayStartIso: string, targetIso: string): number {
  return (new Date(targetIso).getTime() - new Date(todayStartIso).getTime()) / (60 * 60 * 1000);
}

interface Block {
  reservation: Reservation;
  left: number;
  width: number;
}

// 表示上の最小幅（MIN_BLOCK_WIDTH）を確保すると、時間的には重ならない
// 隣接予約（例: 11:00-12:00 と 12:00-13:00）でも表示上は重なって見えることがある。
// そのため各ブロックを時系列順に走査し、表示上重なるものだけ別レーン（段）に振り分ける。
function assignLanes(blocks: Block[]): number[] {
  const order = blocks.map((_, i) => i).sort((a, b) => blocks[a]!.left - blocks[b]!.left);
  const laneEnds: number[] = [];
  const laneOf = new Array<number>(blocks.length).fill(0);

  for (const i of order) {
    const b = blocks[i]!;
    let lane = laneEnds.findIndex((end) => b.left >= end + LANE_GAP_PX);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(b.left + b.width);
    } else {
      laneEnds[lane] = b.left + b.width;
    }
    laneOf[i] = lane;
  }
  return laneOf;
}

export function TodayGanttChart({ reservations, todayStartIso, nowIso, dict }: TodayGanttChartProps) {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const r of reservations) {
    const s = Math.max(0, hoursSinceMidnight(todayStartIso, r.startTime));
    const e = Math.min(24, hoursSinceMidnight(todayStartIso, r.endTime));
    startHour = Math.min(startHour, Math.floor(s));
    endHour = Math.max(endHour, Math.ceil(e));
  }
  startHour = Math.max(0, startHour);
  endHour = Math.min(24, endHour);
  const totalHours = Math.max(1, endHour - startHour);
  const totalWidth = totalHours * PX_PER_HOUR;

  const hourTicks = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  const blocks: Block[] = reservations.map((r) => {
    const s = Math.max(0, hoursSinceMidnight(todayStartIso, r.startTime));
    const e = Math.min(24, hoursSinceMidnight(todayStartIso, r.endTime));
    const left = Math.max(0, (s - startHour) * PX_PER_HOUR);
    const width = Math.max(MIN_BLOCK_WIDTH, (e - s) * PX_PER_HOUR);
    return { reservation: r, left, width };
  });
  const lanes = assignLanes(blocks);
  const laneCount = lanes.length > 0 ? Math.max(...lanes) + 1 : 1;
  const trackHeight = laneCount * LANE_HEIGHT + 12;

  const nowHours = hoursSinceMidnight(todayStartIso, nowIso);
  const showNow = nowHours >= startHour && nowHours <= endHour;
  const nowLeft = (nowHours - startHour) * PX_PER_HOUR;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="overflow-x-auto pb-1">
        <div style={{ width: totalWidth }}>
          <div className="relative h-5">
            {hourTicks
              .filter((h) => h % 2 === 0)
              .map((h) => (
                <span
                  key={h}
                  className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums text-gray-400"
                  style={{ left: (h - startHour) * PX_PER_HOUR }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
          </div>

          <div className="relative rounded-lg bg-gray-50" style={{ height: trackHeight }}>
            {hourTicks.map((h) => (
              <div
                key={h}
                className="absolute bottom-0 top-0 w-px bg-gray-200"
                style={{ left: (h - startHour) * PX_PER_HOUR }}
              />
            ))}

            {showNow && (
              <div className="absolute bottom-0 top-0 z-10 w-0.5 bg-red-400" style={{ left: nowLeft }}>
                <span className="absolute -top-4 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-red-500">
                  {dict.gantt.now}
                </span>
              </div>
            )}

            {blocks.map((block, i) => {
              const r = block.reservation;
              return (
                <Link
                  key={r.id}
                  href={`/reservations/${r.id}/edit`}
                  className="absolute flex h-11 flex-col justify-center overflow-hidden rounded-lg bg-brand-600 px-2.5 shadow-sm hover:bg-brand-700"
                  style={{ left: block.left, width: block.width, top: (lanes[i] ?? 0) * LANE_HEIGHT + 6 }}
                >
                  <span className="font-mono text-[11px] font-semibold leading-tight tabular-nums text-white">
                    {formatTimeJa(r.startTime)}–{formatTimeJa(r.endTime)}
                  </span>
                  <span className="truncate text-[11px] leading-tight text-brand-50">
                    {r.employeeName} ・ {r.destination}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {reservations.length === 0 ? (
        <p className="mt-3 text-center text-sm text-gray-400">{dict.top.noneToday}</p>
      ) : (
        <p className="mt-3 text-xs text-gray-400">
          {dict.gantt.rangeNote(
            `${String(startHour).padStart(2, "0")}:00`,
            `${String(endHour).padStart(2, "0")}:00`
          )}
        </p>
      )}
    </div>
  );
}
