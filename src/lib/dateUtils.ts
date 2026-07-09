// 日時まわりのユーティリティ。
// このアプリは日本国内の1拠点でのみ使う前提のため、表示は常に
// Asia/Tokyo 固定にする（サーバー・クライアントで表示がずれるのを防ぐため）。

const TIME_ZONE = "Asia/Tokyo";
const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDateTimeJa(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIME_ZONE,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAYS_JA[getJstWeekdayIndex(d)];
  return `${get("month")}/${get("day")}(${weekday}) ${get("hour")}:${get("minute")}`;
}

export function formatTimeJa(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")}`;
}

export function formatDateJa(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAYS_JA[getJstWeekdayIndex(d)];
  return `${get("year")}/${get("month")}/${get("day")}(${weekday})`;
}

function getJstWeekdayIndex(d: Date): number {
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekdayStr] ?? d.getDay();
}

// YYYY-MM-DD (Asia/Tokyo) を返す。日付の範囲比較に使う。
function jstDateKey(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(d); // "YYYY-MM-DD"
}

export function isSameJstDate(isoA: string, isoB: string): boolean {
  return jstDateKey(new Date(isoA)) === jstDateKey(new Date(isoB));
}

/** 今日（JST）の 00:00〜翌日 00:00 を返す */
export function getTodayRangeJst(now: Date = new Date()): { start: Date; end: Date } {
  const todayKey = jstDateKey(now);
  const start = new Date(`${todayKey}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** 今週（月曜始まり、JST）の範囲を返す */
export function getThisWeekRangeJst(now: Date = new Date()): { start: Date; end: Date } {
  const { start: todayStart } = getTodayRangeJst(now);
  const weekdayIndex = getJstWeekdayIndex(todayStart); // 0=Sun..6=Sat
  const daysSinceMonday = (weekdayIndex + 6) % 7; // Mon=0
  const start = new Date(todayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/** <input type="datetime-local"> の value ("YYYY-MM-DDTHH:mm") を ISO 文字列に変換 */
export function datetimeLocalToIso(value: string): string {
  // datetime-local の value にはタイムゾーン情報がなく、ブラウザの
  // ローカルタイムゾーンとして解釈される（社内利用のため常に JST 前提）。
  const d = new Date(value);
  return d.toISOString();
}

/** ISO 文字列を <input type="datetime-local"> の value に変換（Asia/Tokyo 表示） */
export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d); // "YYYY-MM-DD HH:mm"
  return parts.replace(" ", "T");
}

/** 30分単位に切り上げた「次の予約可能時刻」の datetime-local value（デフォルト値用） */
export function nextSlotDatetimeLocal(now: Date = new Date()): string {
  const ms = 30 * 60 * 1000;
  const rounded = new Date(Math.ceil(now.getTime() / ms) * ms);
  return isoToDatetimeLocal(rounded.toISOString());
}

/** "00:00" から "23:30" までの30分刻みの時刻文字列一覧（時刻プルダウン用） */
export const TIME_SLOT_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

/** datetime-local value ("YYYY-MM-DDTHH:mm") を日付部分と時刻部分に分割する */
export function splitDatetimeLocal(value: string): { date: string; time: string } {
  const [date, time] = value.split("T");
  return { date: date ?? "", time: time ?? "" };
}

/** 日付部分 ("YYYY-MM-DD") と時刻部分 ("HH:mm") を datetime-local value に結合する */
export function combineDatetimeLocal(date: string, time: string): string {
  return `${date}T${time}`;
}
