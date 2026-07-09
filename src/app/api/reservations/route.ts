import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { validateReservationInput } from "@/lib/reservationRules";
import { hasOverlappingReservation, isExclusionViolation } from "@/lib/overlapCheck";
import type { ReservationInput } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/reservations?from=ISO&to=ISO
// from/to を省略すると全予約を返す（全予約一覧用）。
// 指定すると、その範囲と重なる予約のみ返す（今日/今週の予約用）。
export async function GET(request: NextRequest) {
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
    return NextResponse.json({ errors: ["予約の取得に失敗しました。"] }, { status: 500 });
  }

  const reservations = (data as ReservationRow[]).map(mapReservationRow);
  return NextResponse.json({ reservations });
}

// POST /api/reservations - 新規予約登録
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: ReservationInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: ["リクエストの形式が正しくありません。"] }, { status: 400 });
  }

  const validation = validateReservationInput(body);
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const start = new Date(body.startTime);
  const end = new Date(body.endTime);

  try {
    const overlapping = await hasOverlappingReservation(supabase, start, end);
    if (overlapping) {
      return NextResponse.json(
        { errors: ["この時間帯はすでに予約が入っています。別の時間を選択してください。"] },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        employee_name: body.employeeName,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        destination: body.destination,
        purpose: body.purpose,
        note: body.note ?? null,
      })
      .select("*")
      .single();

    if (error) {
      if (isExclusionViolation(error)) {
        return NextResponse.json(
          { errors: ["この時間帯はすでに予約が入っています。別の時間を選択してください。"] },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ reservation: mapReservationRow(data as ReservationRow) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ errors: ["予約の登録に失敗しました。"] }, { status: 500 });
  }
}
