import type { Locale } from "./i18n/locales";

export type ReservationStatus = "reserved" | "in_use" | "completed" | "cancelled" | "no_show" | "overdue";

export interface Reservation {
  id: string;
  /** 【レガシー】文字列のみの使用者名。ownerUserId が null の未移行予約はこれを表示に使う。 */
  employeeName: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  destination: string;
  purpose: string;
  note: string | null;
  /** destination/purpose が入力された言語。表示側の翻訳出し分けに使う。 */
  inputLocale: Locale;
  /** 行き先の機械翻訳キャッシュ（inputLocaleとは逆の言語）。翻訳失敗時はnull。 */
  destinationTranslated: string | null;
  /** 用途の機械翻訳キャッシュ（inputLocaleとは逆の言語）。翻訳失敗時はnull。 */
  purposeTranslated: string | null;
  vehicleId: string;
  /** 予約の所有者（users.id）。移行前の未割当予約は null。 */
  ownerUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  status: ReservationStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationInput {
  employeeName: string;
  startTime: string; // ISO 8601 (datetime-local value converted to ISO)
  endTime: string; // ISO 8601
  destination: string;
  purpose: string;
  note?: string | null;
  /** vehicle_manager/system_admin が代理予約する場合のみ指定（省略時は自分の予約になる） */
  onBehalfOfUserId?: string | null;
  /** 二重送信防止用の冪等キー。フォームを開いた時点で1回だけ生成しクライアントで保持する。 */
  idempotencyKey?: string;
}

export type VehicleStatus = "available" | "in_use" | "maintenance" | "out_of_service";

export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string | null;
  model: string | null;
  parkingLocation: string | null;
  keyLocation: string | null;
  etcCardLocation: string | null;
  fuelCardLocation: string | null;
  emergencyContact: string | null;
  insuranceContact: string | null;
  roadsideAssistanceContact: string | null;
  notes: string | null;
  status: VehicleStatus;
  active: boolean;
  inspectionDueDate: string | null;
  insuranceDueDate: string | null;
  nextServiceDueDate: string | null;
  oilChangeDueDate: string | null;
  tireChangeDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  bookingHorizonDays: number;
  normalMaxDurationMinutes: number;
  managerMaxDurationMinutes: number;
  minimumDurationMinutes: number;
  timeSlotMinutes: number;
  maxConcurrentReservationsPerUser: number;
  reminderDayBeforeEnabled: boolean;
  reminderBeforeStartMinutes: number;
  updatedByUserId: string | null;
  updatedAt: string;
}

export type MaintenanceType = "inspection" | "service" | "repair" | "tire_change" | "cleaning" | "other";
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface MaintenanceBlock {
  id: string;
  vehicleId: string;
  startAt: string;
  endAt: string;
  type: MaintenanceType;
  reason: string | null;
  status: MaintenanceStatus;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  beforeData: unknown;
  afterData: unknown;
  reason: string | null;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  department: string | null;
  age: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface EmployeeInput {
  name: string;
  department?: string | null;
  age?: number | null;
}

export interface ApiErrorResponse {
  errors: string[];
}

// ------------------------------------------------------------
// 認証・権限（Supabase Auth）
// ------------------------------------------------------------

/**
 * employee: 予約一覧の閲覧、自分の予約の作成・変更・キャンセル、出発/返却など自分の利用操作
 * vehicle_manager: 全予約の管理、車両の状態変更、整備登録、過去記録の訂正、利用実績確認
 * system_admin: ユーザー管理・権限管理・システム設定に加え vehicle_manager の全権限
 */
export type Role = "employee" | "vehicle_manager" | "system_admin";

export interface AppUser {
  id: string; // auth.users.id と同一
  email: string;
  displayName: string;
  role: Role;
  department: string | null;
  locale: string;
  active: boolean;
  driverEligible: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReservationLogAction = "create" | "update" | "delete";

export interface ReservationLog {
  id: string;
  action: ReservationLogAction;
  employeeName: string;
  reservationStartTime: string | null;
  reservationEndTime: string | null;
  reservationDestination: string | null;
  createdAt: string;
}
