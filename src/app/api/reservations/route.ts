import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { validateReservationInput } from "@/lib/reservationRules";
import { hasOverlappingReservation, isExclusionViolation } from "@/lib/overlapCheck";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { translateReservationFields } from "@/lib/translate";
import type { ReservationInput } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/reservations?from=ISO&to=ISO
// from/to を省略すると全予約を返す（全予約一覧用）。
// 指定すると、その範囲と重なる予約のみ返す（今日/今週の予約用）。
export async function GET(request: NextRequest) {
  const dict = getDictionary(getLocale());
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase.from("reservations").select("*").order("start_time", { ascending: true });

  if (from && to) {
    query = query.lt("start_time", to).gt("end_time", from);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }

  const reservations = (data as ReservationRow[]).map(mapReservationRow);
  return NextResponse.json({ reservations });
}

// POST /api/reservations - 新規予約登録
export async function POST(request: NextRequest) {
  const dict = getDictionary(getLocale());
  const supabase = getSupabaseAdmin();

  let body: ReservationInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const validation = validateReservationInput(body, dict);
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const start = new Date(body.startTime);
  const end = new Date(body.endTime);

  try {
    const overlapping = await hasOverlappingReservation(supabase, start, end);
    if (overlapping) {
      return NextResponse.json({ errors: [dict.validation.overlap] }, { status: 409 });
    }

    const { inputLocale, destinationTranslated, purposeTranslated } = await translateReservationFields(
      body.destination,
      body.purpose
    );

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        employee_name: body.employeeName,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        destination: body.destination,
        purpose: body.purpose,
        note: body.note ?? null,
        input_locale: inputLocale,
        destination_translated: destinationTranslated,
        purpose_translated: purposeTranslated,
      })
      .select("*")
      .single();

    if (error) {
      if (isExclusionViolation(error)) {
        return NextResponse.json({ errors: [dict.validation.overlap] }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ reservation: mapReservationRow(data as ReservationRow) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ errors: [dict.apiErrors.createFailed] }, { status: 500 });
  }
}
