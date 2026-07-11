import type { Locale } from "./i18n/locales";
import type {
  AppSettings,
  AppUser,
  AuditLog,
  Employee,
  MaintenanceBlock,
  MaintenanceStatus,
  MaintenanceType,
  Reservation,
  ReservationLog,
  ReservationLogAction,
  ReservationStatus,
  Role,
  Vehicle,
  VehicleStatus,
} from "./types";

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
  input_locale: Locale;
  destination_translated: string | null;
  purpose_translated: string | null;
  vehicle_id: string;
  owner_user_id: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  status: ReservationStatus;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by_user_id: string | null;
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
    inputLocale: row.input_locale,
    destinationTranslated: row.destination_translated,
    purposeTranslated: row.purpose_translated,
    vehicleId: row.vehicle_id,
    ownerUserId: row.owner_user_id,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    status: row.status,
    cancellationReason: row.cancellation_reason,
    cancelledAt: row.cancelled_at,
    cancelledByUserId: row.cancelled_by_user_id,
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

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  department: string | null;
  locale: string;
  active: boolean;
  driver_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export function mapUserRow(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    department: row.department,
    locale: row.locale,
    active: row.active,
    driverEligible: row.driver_eligible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface VehicleRow {
  id: string;
  name: string;
  plate_number: string | null;
  model: string | null;
  parking_location: string | null;
  key_location: string | null;
  etc_card_location: string | null;
  fuel_card_location: string | null;
  emergency_contact: string | null;
  insurance_contact: string | null;
  roadside_assistance_contact: string | null;
  notes: string | null;
  status: VehicleStatus;
  active: boolean;
  inspection_due_date: string | null;
  insurance_due_date: string | null;
  next_service_due_date: string | null;
  oil_change_due_date: string | null;
  tire_change_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export function mapVehicleRow(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    plateNumber: row.plate_number,
    model: row.model,
    parkingLocation: row.parking_location,
    keyLocation: row.key_location,
    etcCardLocation: row.etc_card_location,
    fuelCardLocation: row.fuel_card_location,
    emergencyContact: row.emergency_contact,
    insuranceContact: row.insurance_contact,
    roadsideAssistanceContact: row.roadside_assistance_contact,
    notes: row.notes,
    status: row.status,
    active: row.active,
    inspectionDueDate: row.inspection_due_date,
    insuranceDueDate: row.insurance_due_date,
    nextServiceDueDate: row.next_service_due_date,
    oilChangeDueDate: row.oil_change_due_date,
    tireChangeDueDate: row.tire_change_due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface AppSettingsRow {
  booking_horizon_days: number;
  normal_max_duration_minutes: number;
  manager_max_duration_minutes: number;
  minimum_duration_minutes: number;
  time_slot_minutes: number;
  max_concurrent_reservations_per_user: number;
  reminder_day_before_enabled: boolean;
  reminder_before_start_minutes: number;
  updated_by_user_id: string | null;
  updated_at: string;
}

export function mapAppSettingsRow(row: AppSettingsRow): AppSettings {
  return {
    bookingHorizonDays: row.booking_horizon_days,
    normalMaxDurationMinutes: row.normal_max_duration_minutes,
    managerMaxDurationMinutes: row.manager_max_duration_minutes,
    minimumDurationMinutes: row.minimum_duration_minutes,
    timeSlotMinutes: row.time_slot_minutes,
    maxConcurrentReservationsPerUser: row.max_concurrent_reservations_per_user,
    reminderDayBeforeEnabled: row.reminder_day_before_enabled,
    reminderBeforeStartMinutes: row.reminder_before_start_minutes,
    updatedByUserId: row.updated_by_user_id,
    updatedAt: row.updated_at,
  };
}

export interface MaintenanceBlockRow {
  id: string;
  vehicle_id: string;
  start_at: string;
  end_at: string;
  type: MaintenanceType;
  reason: string | null;
  status: MaintenanceStatus;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function mapMaintenanceBlockRow(row: MaintenanceBlockRow): MaintenanceBlock {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    startAt: row.start_at,
    endAt: row.end_at,
    type: row.type,
    reason: row.reason,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before_data: unknown;
  after_data: unknown;
  reason: string | null;
  created_at: string;
}

export function mapAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    beforeData: row.before_data,
    afterData: row.after_data,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export interface ReservationLogRow {
  id: string;
  action: ReservationLogAction;
  employee_name: string;
  reservation_start_time: string | null;
  reservation_end_time: string | null;
  reservation_destination: string | null;
  created_at: string;
}

export function mapReservationLogRow(row: ReservationLogRow): ReservationLog {
  return {
    id: row.id,
    action: row.action,
    employeeName: row.employee_name,
    reservationStartTime: row.reservation_start_time,
    reservationEndTime: row.reservation_end_time,
    reservationDestination: row.reservation_destination,
    createdAt: row.created_at,
  };
}
