export interface Reservation {
  id: string;
  employeeName: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  destination: string;
  purpose: string;
  note: string | null;
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
