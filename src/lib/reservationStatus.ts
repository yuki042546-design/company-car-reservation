import type { ReservationStatus, VehicleStatus } from "./types";

// 予約ステータスの許可された遷移。
//   reserved -> in_use -> completed
//   reserved -> cancelled
//   reserved -> no_show
//   in_use -> overdue -> completed
// これ以外の遷移（例: completed -> reserved、cancelled からの復帰など）はすべて拒否する。
const ALLOWED_RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  reserved: ["in_use", "cancelled", "no_show"],
  in_use: ["completed", "overdue"],
  overdue: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransitionReservation(from: ReservationStatus, to: ReservationStatus): boolean {
  return ALLOWED_RESERVATION_TRANSITIONS[from]?.includes(to) ?? false;
}

// 車両ステータスの許可された遷移。out_of_service/maintenance は vehicle_manager 以上が
// 明示的に切り替える運用のため、available <-> in_use 以外は手動遷移として扱う。
const ALLOWED_VEHICLE_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  available: ["in_use", "maintenance", "out_of_service"],
  in_use: ["available", "maintenance", "out_of_service"],
  maintenance: ["available", "out_of_service"],
  out_of_service: ["available", "maintenance"],
};

export function canTransitionVehicle(from: VehicleStatus, to: VehicleStatus): boolean {
  return ALLOWED_VEHICLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isReservationEditableByOwner(status: ReservationStatus): boolean {
  // 一般社員が変更・キャンセルできるのは開始前（reserved）の予約のみ。
  return status === "reserved";
}
