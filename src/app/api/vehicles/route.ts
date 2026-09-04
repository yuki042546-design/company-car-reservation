import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapVehicleRow, type VehicleRow } from "@/lib/mappers";
import { isAdminRequest } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/auditLog";
import { getAllVehicles } from "@/lib/vehicles";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const runtime = "nodejs";

const MAX_VEHICLES = 4;

// GET /api/vehicles - 車両一覧（ログイン機能がないため誰でも閲覧可）
export async function GET() {
  const dict = getDictionary(getLocale());

  try {
    const vehicles = await getAllVehicles();
    return NextResponse.json({ vehicles });
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }
}

// POST /api/vehicles - 車両の新規登録（管理者のみ、最大4台まで）
export async function POST(request: NextRequest) {
  const dict = getDictionary(getLocale());

  if (!isAdminRequest()) {
    return NextResponse.json({ errors: [dict.apiErrors.forbidden] }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ errors: [dict.apiErrors.vehicleNameRequired] }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { count, error: countError } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true });
  if (countError) {
    return NextResponse.json({ errors: [dict.apiErrors.addVehicleFailed] }, { status: 500 });
  }
  if ((count ?? 0) >= MAX_VEHICLES) {
    return NextResponse.json({ errors: [dict.apiErrors.vehicleLimitReached] }, { status: 409 });
  }

  const stringFields = [
    "plateNumber",
    "model",
    "vehicleType",
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
    plateNumber: "plate_number",
    model: "model",
    vehicleType: "vehicle_type",
    parkingLocation: "parking_location",
    keyLocation: "key_location",
    etcCardLocation: "etc_card_location",
    fuelCardLocation: "fuel_card_location",
    emergencyContact: "emergency_contact",
    insuranceContact: "insurance_contact",
    roadsideAssistanceContact: "roadside_assistance_contact",
    notes: "notes",
  };
  const insert: Record<string, unknown> = { name };
  for (const field of stringFields) {
    if (field in body && typeof body[field] === "string") {
      insert[columnNameByField[field]] = (body[field] as string).trim() || null;
    }
  }
  if (typeof body.trackMileage === "boolean") {
    insert.track_mileage = body.trackMileage;
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
    if (field in body && typeof body[field] === "string" && body[field]) {
      insert[dateColumnByField[field]] = body[field];
    }
  }

  const { data, error } = await supabase.from("vehicles").insert(insert).select("*").single();
  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.addVehicleFailed] }, { status: 500 });
  }

  const created = mapVehicleRow(data as VehicleRow);

  await writeAuditLog(supabase, {
    actorUserId: null,
    actorEmail: "admin",
    action: "vehicle_create",
    targetType: "vehicle",
    targetId: created.id,
    afterData: created,
  });

  return NextResponse.json({ vehicle: created }, { status: 201 });
}
