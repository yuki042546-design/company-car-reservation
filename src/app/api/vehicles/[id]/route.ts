import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapVehicleRow, type VehicleRow } from "@/lib/mappers";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { canTransitionVehicle } from "@/lib/reservationStatus";
import { writeAuditLog } from "@/lib/auditLog";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { VehicleStatus } from "@/lib/types";

export const runtime = "nodejs";

interface RouteParams {
  params: { id: string };
}

const VALID_STATUSES: VehicleStatus[] = ["available", "in_use", "maintenance", "out_of_service"];

// PATCH /api/vehicles/[id] - 車両情報・状態の変更（vehicle_manager以上のみ）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;
  const roleError = requireApiRole(auth.user, "vehicle_manager", dict);
  if (roleError) return roleError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existingRow, error: fetchError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchError || !existingRow) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
  }
  const existing = mapVehicleRow(existingRow as VehicleRow);

  const update: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    const nextStatus = body.status as VehicleStatus;
    if (!VALID_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
    }
    if (nextStatus !== existing.status && !canTransitionVehicle(existing.status, nextStatus)) {
      return NextResponse.json({ errors: [dict.action.invalidTransition] }, { status: 409 });
    }
    update.status = nextStatus;
  }

  const stringFields = [
    "name",
    "plateNumber",
    "model",
    "parkingLocation",
    "keyLocation",
    "etcCardLocation",
    "fuelCardLocation",
    "emergencyContact",
    "insuranceContact",
    "roadsideAssistanceContact",
    "notes",
  ] as const;
  const columnNameByField: Record<(typeof stringFields)[number], string> = {
    name: "name",
    plateNumber: "plate_number",
    model: "model",
    parkingLocation: "parking_location",
    keyLocation: "key_location",
    etcCardLocation: "etc_card_location",
    fuelCardLocation: "fuel_card_location",
    emergencyContact: "emergency_contact",
    insuranceContact: "insurance_contact",
    roadsideAssistanceContact: "roadside_assistance_contact",
    notes: "notes",
  };
  for (const field of stringFields) {
    if (field in body && typeof body[field] === "string") {
      update[columnNameByField[field]] = (body[field] as string).trim() || null;
    }
  }

  const dateFields = [
    "inspectionDueDate",
    "insuranceDueDate",
    "nextServiceDueDate",
    "oilChangeDueDate",
    "tireChangeDueDate",
  ] as const;
  const dateColumnByField: Record<(typeof dateFields)[number], string> = {
    inspectionDueDate: "inspection_due_date",
    insuranceDueDate: "insurance_due_date",
    nextServiceDueDate: "next_service_due_date",
    oilChangeDueDate: "oil_change_due_date",
    tireChangeDueDate: "tire_change_due_date",
  };
  for (const field of dateFields) {
    if (field in body) {
      update[dateColumnByField[field]] = typeof body[field] === "string" ? body[field] : null;
    }
  }

  if (typeof body.active === "boolean") {
    update.active = body.active;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.updateFailed] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
  }

  const updated = mapVehicleRow(data as VehicleRow);

  await writeAuditLog(supabase, {
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: "vehicle_update",
    targetType: "vehicle",
    targetId: updated.id,
    beforeData: existing,
    afterData: updated,
  });

  return NextResponse.json({ vehicle: updated });
}
