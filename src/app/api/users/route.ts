import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapUserRow, type UserRow } from "@/lib/mappers";
import { isAllowedEmailDomain, requireApiRole, requireApiUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const VALID_ROLES: Role[] = ["employee", "vehicle_manager", "system_admin"];

// GET /api/users - ユーザー一覧（vehicle_manager以上のみ。過去予約の割当・車両管理で使用）
export async function GET() {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const roleError = requireApiRole(auth.user, "vehicle_manager", dict);
  if (roleError) return roleError;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchEmployeesFailed] }, { status: 500 });
  }

  return NextResponse.json({ users: (data as UserRow[]).map(mapUserRow) });
}

// POST /api/users - 新規ユーザーの招待（system_adminのみ）
// Supabase Auth の Admin API でメール招待を送信する。招待を受けたユーザーが
// メール内のリンクからパスワードを設定すると、トリガーにより public.users
// にプロフィール行（role='employee'）が自動作成される。ここではその初期値を
// 上書きするため、招待後に指定ロール・部署で users 行を更新する。
export async function POST(request: NextRequest) {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const roleError = requireApiRole(auth.user, "system_admin", dict);
  if (roleError) return roleError;

  let body: { email?: string; role?: string; department?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  if (!isAllowedEmailDomain(email)) {
    return NextResponse.json({ errors: [dict.apiErrors.invalidEmailDomain] }, { status: 400 });
  }

  const role: Role = VALID_ROLES.includes(body.role as Role) ? (body.role as Role) : "employee";
  const department = body.department?.trim() || null;

  const supabase = getSupabaseAdmin();

  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited?.user) {
    return NextResponse.json({ errors: [dict.apiErrors.inviteFailed] }, { status: 500 });
  }

  // トリガーによる public.users 行の作成は auth.users insert の直後に走るため、
  // ここで役割・部署を上書きする（作成が非同期で遅延した場合に備え少し待って再試行する）。
  let updated = null;
  for (let attempt = 0; attempt < 3 && !updated; attempt++) {
    const { data } = await supabase
      .from("users")
      .update({ role, department })
      .eq("id", invited.user.id)
      .select("*")
      .maybeSingle();
    if (data) {
      updated = data;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (!updated) {
    // 招待自体は成功しているため、初期ロールは employee のまま。
    // 管理者は後から PATCH /api/users/[id] で修正できる。
    return NextResponse.json({ ok: true, warning: "role_not_applied" }, { status: 201 });
  }

  return NextResponse.json({ user: mapUserRow(updated as UserRow) }, { status: 201 });
}
