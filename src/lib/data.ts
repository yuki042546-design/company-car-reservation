import { getSupabaseAdmin } from "./supabaseAdmin";
import {
  mapAppSettingsRow,
  mapAuditLogRow,
  mapEmployeeRow,
  mapMaintenanceBlockRow,
  mapReservationLogRow,
  mapReservationRow,
  mapUserRow,
  type AppSettingsRow,
  type AuditLogRow,
  type EmployeeRow,
  type MaintenanceBlockRow,
  type ReservationLogRow,
  type ReservationRow,
  type UserRow,
} from "./mappers";
import type { AppSettings, AppUser, AuditLog, Employee, MaintenanceBlock, Reservation, ReservationLog } from "./types";
import { getThisWeekRangeJst, getTodayRangeJst } from "./dateUtils";

// サーバーコンポーネント（page.tsx）から直接呼び出すデータ取得関数。
// API ルートを経由せず Supabase に直接問い合わせることで、トップページの
// 初期表示を高速化している。

export async function getAllReservations(): Promise<Reservation[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data as ReservationRow[]).map(mapReservationRow);
}

/**
 * 管理者画面向け。過去分も含め無制限に全件取得しないよう、直近の予約に絞って返す
 * （検索・絞り込みは現状クライアント側で行うため、まずは妥当な件数に制限する）。
 */
export async function getRecentReservations(limit = 200): Promise<Reservation[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("start_time", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ReservationRow[]).map(mapReservationRow);
}

export async function getReservationsInRange(start: Date, end: Date): Promise<Reservation[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data as ReservationRow[]).map(mapReservationRow);
}

export async function getTodayReservations(): Promise<Reservation[]> {
  const { start, end } = getTodayRangeJst();
  return getReservationsInRange(start, end);
}

export async function getThisWeekReservations(): Promise<Reservation[]> {
  const { start, end } = getThisWeekRangeJst();
  return getReservationsInRange(start, end);
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("reservations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapReservationRow(data as ReservationRow) : null;
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as EmployeeRow[]).map(mapEmployeeRow);
}

export async function getAllEmployees(): Promise<Employee[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as EmployeeRow[]).map(mapEmployeeRow);
}

export async function getReservationLogs(limit = 200): Promise<ReservationLog[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reservation_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ReservationLogRow[]).map(mapReservationLogRow);
}

export async function getAllUsers(): Promise<AppUser[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data as UserRow[]).map(mapUserRow);
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  bookingHorizonDays: 90,
  normalMaxDurationMinutes: 240,
  managerMaxDurationMinutes: 480,
  minimumDurationMinutes: 30,
  timeSlotMinutes: 30,
  maxConcurrentReservationsPerUser: 3,
  reminderDayBeforeEnabled: true,
  reminderBeforeStartMinutes: 30,
  updatedByUserId: null,
  updatedAt: new Date(0).toISOString(),
};

/** app_settings はシングルトン行。未作成の場合（マイグレーション未適用など）はコード側の既定値を返す。 */
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  return data ? mapAppSettingsRow(data as AppSettingsRow) : DEFAULT_APP_SETTINGS;
}

/** 整備・利用停止期間の一覧（新しい開始日時順）。 */
export async function getMaintenanceBlocks(): Promise<MaintenanceBlock[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("maintenance_blocks")
    .select("*")
    .order("start_at", { ascending: false });
  if (error) throw error;
  return (data as MaintenanceBlockRow[]).map(mapMaintenanceBlockRow);
}

export async function getAuditLogs(limit = 200): Promise<AuditLog[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AuditLogRow[]).map(mapAuditLogRow);
}

/** 現在使用中（in_use/overdue）の予約を1件返す（単一車両運用のため高々1件のはず）。 */
export async function getCurrentUsageReservation(vehicleId: string): Promise<Reservation | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .in("status", ["in_use", "overdue"])
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapReservationRow(data as ReservationRow) : null;
}

/** 次に予定されている（reserved状態で開始が最も早い）予約を返す。 */
export async function getNextReservation(vehicleId: string, from: Date = new Date()): Promise<Reservation | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("status", "reserved")
    .gte("start_time", from.toISOString())
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapReservationRow(data as ReservationRow) : null;
}

export type ReservationListTab = "self" | "today" | "upcoming" | "in_use" | "past" | "cancelled";

export interface ReservationFilterOptions {
  tab: ReservationListTab;
  /** ログイン機能がないため、「自分の予約」タブは自己申告の使用者名で絞り込む */
  employeeName?: string;
  page?: number;
  pageSize?: number;
}

export interface ReservationFilterResult {
  reservations: Reservation[];
  hasMore: boolean;
  total: number | null;
}

/**
 * 予約一覧のタブ・フィルターに対応するデータ取得関数。
 * 過去予約等を無制限に一括取得しないよう、ページネーション（range）を使う。
 */
export async function getFilteredReservations(options: ReservationFilterOptions): Promise<ReservationFilterResult> {
  if (options.tab === "self" && !options.employeeName) {
    return { reservations: [], hasMore: false, total: 0 };
  }

  const supabase = getSupabaseAdmin();
  const pageSize = options.pageSize ?? 30;
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("reservations").select("*", { count: "exact" });
  const now = new Date();

  switch (options.tab) {
    case "self":
      query = query.eq("employee_name", options.employeeName).order("start_time", { ascending: false });
      break;
    case "today": {
      const { start, end } = getTodayRangeJst(now);
      query = query
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString())
        .order("start_time", { ascending: true });
      break;
    }
    case "upcoming":
      query = query
        .eq("status", "reserved")
        .gte("start_time", now.toISOString())
        .order("start_time", { ascending: true });
      break;
    case "in_use":
      query = query.in("status", ["in_use", "overdue"]).order("start_time", { ascending: true });
      break;
    case "past":
      query = query.in("status", ["completed", "no_show"]).order("start_time", { ascending: false });
      break;
    case "cancelled":
      query = query.eq("status", "cancelled").order("start_time", { ascending: false });
      break;
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const reservations = (data as ReservationRow[]).map(mapReservationRow);
  const hasMore = count !== null ? to + 1 < count : reservations.length === pageSize;
  return { reservations, hasMore, total: count ?? null };
}
