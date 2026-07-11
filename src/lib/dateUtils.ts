// 日時まわりのユーティリティ。
// このアプリは日本国内の1拠点でのみ使う前提のため、表示のタイムゾーンは常に
// Asia/Tokyo 固定にする（サーバー・クライアントで表示がずれるのを防ぐため）。
// 一方で表示言語（曜日表記や数字の並び）は locale 引数で切り替える。

import { INTL_LOCALE_TAG, type Locale } from "./i18n/locales";

const TIME_ZONE = "Asia/Tokyo";

/** "7/9(木) 14:30" のような日時表示。locale に応じて曜日表記が変わる。 */
export function formatDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat(INTL_LOCALE_TAG[locale], {
    timeZone: TIME_ZONE,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = getJstWeekdayLabel(d, locale);
  return `${get("month")}/${get("day")}(${weekday}) ${get("hour")}:${get("minute")}`;
}

/** "14:30" のような時刻のみの表示。24時間表記の数字のみなので言語による違いはない。 */
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

/** "2026/7/9(木)" のような日付表示。locale に応じて曜日表記が変わる。 */
export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat(INTL_LOCALE_TAG[locale], {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = getJstWeekdayLabel(d, locale);
  return `${get("year")}/${get("month")}/${get("day")}(${weekday})`;
}

/** 曜日の短縮表記（日本語なら「木」、ベトナム語なら "Th 5" など）を locale に応じて取得する */
function getJstWeekdayLabel(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE_TAG[locale], {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(d);
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

/** ISO文字列から "YYYY-MM-DD"（Asia/Tokyo）の日付キーを取得する。カレンダー表示用。 */
export function getJstDateKey(iso: string): string {
  return jstDateKey(new Date(iso));
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

/** 今月（Asia/Tokyo）の "YYYY-MM" キー。省略時は現在時刻から算出する。 */
function currentMonthKey(now: Date = new Date()): string {
  return jstDateKey(now).slice(0, 7);
}

/** "YYYY-MM" キーを ±delta ヶ月ずらした "YYYY-MM" キーを返す（カレンダーの月送りに使う）。 */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 指定した月（Asia/Tokyo、省略時は今月）の 1日 00:00〜翌月1日 00:00 の範囲を返す */
export function getMonthRangeJst(
  monthKey?: string,
  now: Date = new Date()
): { start: Date; end: Date; monthKey: string } {
  const key = monthKey ?? currentMonthKey(now);
  const start = new Date(`${key}-01T00:00:00+09:00`);
  const nextMonthKey = shiftMonthKey(key, 1);
  const end = new Date(`${nextMonthKey}-01T00:00:00+09:00`);
  return { start, end, monthKey: key };
}

/** "2026年7月" のような月ラベル表示。locale に応じて表記が変わる。 */
export function formatMonthLabel(monthKey: string, locale: Locale): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1, 1));
  return new Intl.DateTimeFormat(INTL_LOCALE_TAG[locale], {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(d);
}

/** 月曜始まりの曜日見出しラベル（月, 火, ... のような短縮表記）を locale に応じて返す */
export function getWeekdayHeaderLabels(locale: Locale): string[] {
  // 2024-01-01 は月曜日（timeZone: UTC で固定的に曜日を算出するための基準日）
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return new Intl.DateTimeFormat(INTL_LOCALE_TAG[locale], { timeZone: "UTC", weekday: "short" }).format(d);
  });
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

/** datetime-local value に分数を加算した datetime-local value を返す（利用時間プルダウンの終了時刻計算用） */
export function addMinutesToDatetimeLocal(value: string, minutes: number): string {
  const start = new Date(datetimeLocalToIso(value));
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  return isoToDatetimeLocal(end.toISOString());
}

/** 2つの datetime-local value の差（分）を返す（終了時刻から利用時間プルダウンの初期選択を決めるため） */
export function minutesBetweenDatetimeLocal(startValue: string, endValue: string): number {
  const start = new Date(datetimeLocalToIso(startValue));
  const end = new Date(datetimeLocalToIso(endValue));
  return Math.round((end.getTime() - start.getTime()) / 60000);
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
