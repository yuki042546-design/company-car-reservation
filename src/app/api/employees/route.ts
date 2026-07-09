import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapEmployeeRow, type EmployeeRow } from "@/lib/mappers";
import { isAdminRequest } from "@/lib/requireAdmin";
import { validateNewEmployeeInput } from "@/lib/employeeRules";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const runtime = "nodejs";

// GET /api/employees?all=1
// デフォルトでは有効な社員のみ返す（予約フォームのプルダウン用）。
// all=1 を付けると管理者画面用に無効化された社員も含めて全件返す。
export async function GET(request: NextRequest) {
  const dict = getDictionary(getLocale());
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("all") === "1";

  let query = supabase.from("employees").select("*").order("created_at", { ascending: true });
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchEmployeesFailed] }, { status: 500 });
  }

  const employees = (data as EmployeeRow[]).map(mapEmployeeRow);
  return NextResponse.json({ employees });
}

// POST /api/employees - 社員追加（管理者のみ）
export async function POST(request: NextRequest) {
  const dict = getDictionary(getLocale());

  if (!isAdminRequest()) {
    return NextResponse.json({ errors: [dict.apiErrors.adminOnly] }, { status: 401 });
  }

  let body: { name?: string; department?: string | null; age?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const validation = validateNewEmployeeInput(body, dict);
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const name = body.name!.trim();
  const department = body.department?.trim() || null;
  const age = body.age ?? null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .insert({ name, department, age })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.addEmployeeFailed] }, { status: 500 });
  }

  return NextResponse.json({ employee: mapEmployeeRow(data as EmployeeRow) }, { status: 201 });
}
