import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapEmployeeRow, type EmployeeRow } from "@/lib/mappers";
import { isAdminRequest } from "@/lib/requireAdmin";
import { isValidAge, isValidDepartment, MAX_AGE, MIN_AGE } from "@/lib/employeeRules";
import { writeAuditLog } from "@/lib/auditLog";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const runtime = "nodejs";

interface RouteParams {
  params: { id: string };
}

// PATCH /api/employees/[id] - 社員名・所属部署・年齢の変更（管理者のみ）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  if (!isAdminRequest()) {
    return NextResponse.json({ errors: [dict.apiErrors.forbidden] }, { status: 401 });
  }

  let body: { name?: string; department?: string | null; age?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const update: { name?: string; department?: string | null; age?: number | null } = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ errors: [dict.employeeValidation.nameRequired] }, { status: 400 });
    }
    update.name = trimmed;
  }
  if ("department" in body) {
    const department = body.department?.trim() || null;
    if (department && !isValidDepartment(department)) {
      return NextResponse.json(
        { errors: [dict.employeeValidation.departmentTooLong(100)] },
        { status: 400 }
      );
    }
    update.department = department;
  }
  if ("age" in body) {
    if (body.age === null || body.age === undefined) {
      update.age = null;
    } else if (!isValidAge(body.age)) {
      return NextResponse.json(
        { errors: [dict.employeeValidation.ageRange(MIN_AGE, MAX_AGE)] },
        { status: 400 }
      );
    } else {
      update.age = body.age;
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.updateEmployeeFailed] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: [dict.apiErrors.employeeNotFound] }, { status: 404 });
  }

  return NextResponse.json({ employee: mapEmployeeRow(data as EmployeeRow) });
}

// DELETE /api/employees/[id] - 社員の削除（管理者のみ）
// 予約は使用者名を自己申告のテキストとして保存しており、employees.id への
// 外部キー参照はないため、削除しても過去の予約データには影響しない。
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  if (!isAdminRequest()) {
    return NextResponse.json({ errors: [dict.apiErrors.forbidden] }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("employees")
    .delete()
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.deleteEmployeeFailed] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: [dict.apiErrors.employeeNotFound] }, { status: 404 });
  }

  const deleted = mapEmployeeRow(data as EmployeeRow);

  await writeAuditLog(supabase, {
    actorUserId: null,
    actorEmail: "admin",
    action: "employee_delete",
    targetType: "employee",
    targetId: deleted.id,
    beforeData: deleted,
  });

  return NextResponse.json({ employee: deleted });
}
