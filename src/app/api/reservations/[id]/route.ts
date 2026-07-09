import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { validateReservationInput } from "@/lib/reservationRules";
import { hasOverlappingReservation, isExclusionViolation } from "@/lib/overlapCheck";
import { isAdminRequest } from "@/lib/requireAdmin";
import type { ReservationInput } from "@/lib/types";

export const runtime = "nodejs";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("reservations").select("*").eq("id", params.id).maybeSingle();

  if (error) {
    return NextResponse.json({ errors: ["予約の取得に失敗しました。"] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: ["予約が見つかりません。"] }, { status: 404 });
  }

  return NextResponse.json({ reservation: mapReservationRow(data as ReservationRow) });
}

// PUT /api/reservations/[id] - 予約内容の変更（一般社員も利用可）
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const overlapping = await hasOverlappingReservation(supabase, start, end, params.id);
    if (overlapping) {
      return NextResponse.json(
        { errors: ["この時間帯はすでに予約が入っています。別の時間を選択してください。"] },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("reservations")
      .update({
        employee_name: body.employeeName,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        destination: body.destination,
        purpose: body.purpose,
        note: body.note ?? null,
      })
      .eq("id", params.id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (isExclusionViolation(error)) {
        return NextResponse.json(
          { errors: ["この時間帯はすでに予約が入っています。別の時間を選択してください。"] },
          { status: 409 }
        );
      }
      throw error;
    }
    if (!data) {
      return NextResponse.json({ errors: ["予約が見つかりません。"] }, { status: 404 });
    }

    return NextResponse.json({ reservation: mapReservationRow(data as ReservationRow) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ errors: ["予約の更新に失敗しました。"] }, { status: 500 });
  }
}

// DELETE /api/reservations/[id] - 予約削除
// 管理者は誰の予約でも削除できる。管理者でない場合は、削除リクエストに
// 含まれる requesterName（本人が選択・自己申告した使用者名）が予約の
// employee_name と一致する場合のみ削除できる（＝本人の予約のみ削除可）。
// このアプリには本格的な社員ログイン機能がないため「自己申告」による
// 簡易的な本人確認だが、予約登録・変更時の使用者名選択と同じ信頼レベルであり、
// 実運用（社内10名程度）としては妥当な範囲とする。
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAdmin = isAdminRequest();

  let requesterName: string | undefined;
  if (!isAdmin) {
    try {
      const body = await request.json();
      requesterName = typeof body?.requesterName === "string" ? body.requesterName : undefined;
    } catch {
      requesterName = undefined;
    }
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("reservations")
    .select("employee_name")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ errors: ["予約の取得に失敗しました。"] }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ errors: ["予約が見つかりません。"] }, { status: 404 });
  }

  if (!isAdmin) {
    if (!requesterName) {
      return NextResponse.json({ errors: ["本人確認のため、使用者名を選択してください。"] }, { status: 400 });
    }
    if (requesterName !== existing.employee_name) {
      return NextResponse.json(
        { errors: ["この予約はご本人または管理者のみ削除できます。"] },
        { status: 403 }
      );
    }
  }

  const { error } = await supabase.from("reservations").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ errors: ["予約の削除に失敗しました。"] }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
