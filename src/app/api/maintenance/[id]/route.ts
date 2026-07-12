import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapMaintenanceBlockRow, type MaintenanceBlockRow } from "@/lib/mappers";
import { isAdminRequest } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/auditLog";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const runtime = "nodejs";

interface RouteParams {
  params: { id: string };
}

// PATCH /api/maintenance/[id] - 整備・利用停止期間のキャンセル/状態変更（管理者のみ）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  if (!isAdminRequest()) {
    return NextResponse.json({ errors: [dict.apiErrors.forbidden] }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const validStatuses = ["scheduled", "in_progress", "completed", "cancelled"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("maintenance_blocks")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("maintenance_blocks")
    .update({ status: body.status })
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ errors: [dict.maintenance.updateError] }, { status: 500 });
  }

  const block = mapMaintenanceBlockRow(data as MaintenanceBlockRow);

  await writeAuditLog(supabase, {
    actorUserId: null,
    actorEmail: "admin",
    action: "maintenance_update",
    targetType: "maintenance_block",
    targetId: block.id,
    beforeData: existing,
    afterData: block,
  });

  return NextResponse.json({ block });
}
