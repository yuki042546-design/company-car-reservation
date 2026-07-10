import { getSupabaseAdmin } from "./supabaseAdmin";
import {
  mapEmployeeRow,
  mapReservationLogRow,
  mapReservationRow,
  type EmployeeRow,
  type ReservationLogRow,
  type ReservationRow,
} from "./mappers";
import type { Employee, Reservation, ReservationLog } from "./types";
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
