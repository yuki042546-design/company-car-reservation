import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapUserRow, type UserRow } from "@/lib/mappers";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const VALID_ROLES: Role[] = ["employee", "vehicle_manager", "system_admin"];

interface RouteParams {
  params: { id: string };
}

// PATCH /api/users/[id] - 権限・部署・有効/無効・運転資格の変更（system_adminのみ）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const roleError = requireApiRole(auth.user, "system_admin", dict);
  if (roleError) return roleError;

  let body: {
    role?: string;
    department?: string | null;
    active?: boolean;
    driverEligible?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const update: {
    role?: Role;
    department?: string | null;
    active?: boolean;
    driver_eligible?: boolean;
  } = {};

  if (typeof body.role === "string") {
    if (!VALID_ROLES.includes(body.role as Role)) {
      return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
    }
    update.role = body.role as Role;
  }
  if ("department" in body) {
    update.department = body.department?.trim() || null;
  }
  if (typeof body.active === "boolean") {
    update.active = body.active;
  }
  if (typeof body.driverEligible === "boolean") {
    update.driver_eligible = body.driverEligible;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.updateEmployeeFailed] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: [dict.apiErrors.userNotFound] }, { status: 404 });
  }

  return NextResponse.json({ user: mapUserRow(data as UserRow) });
}
