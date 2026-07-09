import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapEmployeeRow, type EmployeeRow } from "@/lib/mappers";
import { isAdminRequest } from "@/lib/requireAdmin";
import { isValidAge, isValidDepartment, MAX_AGE, MIN_AGE } from "@/lib/employeeRules";

export const runtime = "nodejs";

interface RouteParams {
  params: { id: string };
}

// PATCH /api/employees/[id] - 社員名・所属部署・年齢の変更、有効/無効の切り替え（管理者のみ）
// 予約済みの過去データを保持するため、削除ではなく is_active フラグで
// 選択肢から外す方式にしている。
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAdminRequest()) {
    return NextResponse.json({ errors: ["管理者のみ操作できます。"] }, { status: 401 });
  }

  let body: { name?: string; isActive?: boolean; department?: string | null; age?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: ["リクエストの形式が正しくありません。"] }, { status: 400 });
  }

  const update: { name?: string; is_active?: boolean; department?: string | null; age?: number | null } = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ errors: ["社員名を入力してください。"] }, { status: 400 });
    }
    update.name = trimmed;
  }
  if (typeof body.isActive === "boolean") {
    update.is_active = body.isActive;
  }
  if ("department" in body) {
    const department = body.department?.trim() || null;
    if (department && !isValidDepartment(department)) {
      return NextResponse.json({ errors: ["所属部署は100文字以内で入力してください。"] }, { status: 400 });
    }
    update.department = department;
  }
  if ("age" in body) {
    if (body.age === null || body.age === undefined) {
      update.age = null;
    } else if (!isValidAge(body.age)) {
      return NextResponse.json(
        { errors: [`年齢は${MIN_AGE}〜${MAX_AGE}の整数で入力してください。`] },
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
    return NextResponse.json({ errors: ["社員情報の更新に失敗しました。"] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: ["社員が見つかりません。"] }, { status: 404 });
  }

  return NextResponse.json({ employee: mapEmployeeRow(data as EmployeeRow) });
}
