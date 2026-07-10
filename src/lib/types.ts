import type { Locale } from "./i18n/locales";

export interface Reservation {
  id: string;
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
