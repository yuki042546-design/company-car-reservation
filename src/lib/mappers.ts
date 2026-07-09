import type { Employee, Reservation } from "./types";

// Supabase (snake_case) の行を、アプリ内で使う camelCase の型に変換する。
// 将来 Google カレンダー連携などで別のデータソースを足す場合も、
// この変換層だけを差し替えれば UI 側のコードは変更不要になる。

export interface ReservationRow {
  id: string;
  employee_name: string;
  start_time: string;
  end_time: string;
  destination: string;
  purpose: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function mapReservationRow(row: ReservationRow): Reservation {
  return {
    id: row.id,
    employeeName: row.employee_name,
    startTime: row.start_time,
    endTime: row.end_time,
    destination: row.destination,
    purpose: row.purpose,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface EmployeeRow {
  id: string;
  name: string;
  department: string | null;
  age: number | null;
  is_active: boolean;
  created_at: string;
}

export function mapEmployeeRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    age: row.age,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
