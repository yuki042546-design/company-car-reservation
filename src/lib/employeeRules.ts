import type { Dictionary } from "./i18n/dictionary";

export const MIN_AGE = 15;
export const MAX_AGE = 100;
export const MAX_DEPARTMENT_LENGTH = 100;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function isValidAge(age: number): boolean {
  return Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE;
}

export function isValidDepartment(department: string): boolean {
  return department.length <= MAX_DEPARTMENT_LENGTH;
}

/** 新規社員追加時のバリデーション（name は必須） */
export function validateNewEmployeeInput(
  input: { name?: string; department?: string | null; age?: number | null },
  dict: Dictionary
): ValidationResult {
  const errors: string[] = [];
  const v = dict.employeeValidation;

  if (!input.name?.trim()) {
    errors.push(v.nameRequired);
  }
  if (input.age !== undefined && input.age !== null && !isValidAge(input.age)) {
    errors.push(v.ageRange(MIN_AGE, MAX_AGE));
  }
  if (input.department && !isValidDepartment(input.department)) {
    errors.push(v.departmentTooLong(MAX_DEPARTMENT_LENGTH));
  }

  return { valid: errors.length === 0, errors };
}
