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
export function validateNewEmployeeInput(input: {
  name?: string;
  department?: string | null;
  age?: number | null;
}): ValidationResult {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push("社員名を入力してください。");
  }
  if (input.age !== undefined && input.age !== null && !isValidAge(input.age)) {
    errors.push(`年齢は${MIN_AGE}〜${MAX_AGE}の整数で入力してください。`);
  }
  if (input.department && !isValidDepartment(input.department)) {
    errors.push(`所属部署は${MAX_DEPARTMENT_LENGTH}文字以内で入力してください。`);
  }

  return { valid: errors.length === 0, errors };
}
