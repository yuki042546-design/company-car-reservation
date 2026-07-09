import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapReservationRow, type ReservationRow } from "@/lib/mappers";
import { validateReservationInput } from "@/lib/reservationRules";
import { hasOverlappingReservation, isExclusionViolation } from "@/lib/overlapCheck";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { isAdminRequest } from "@/lib/requireAdmin";
import { translateReservationFields } from "@/lib/translate";
import type { ReservationInput } from "@/lib/types";

export const runtime = "nodejs";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const dict = getDictionary(getLocale());
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("reservations").select("*").eq("id", params.id).maybeSingle();

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
  }

  return NextResponse.json({ reservation: mapReservationRow(data as ReservationRow) });
}

// PUT /api/reservations/[id] - 予約内容の変更（一般社員も利用可）
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const overlapping = await hasOverlappingReservation(supabase, start, end, params.id);
    if (overlapping) {
      return NextResponse.json({ errors: [dict.validation.overlap] }, { status: 409 });
    }

    // 行き先・用途の文言が変わっていない場合は、翻訳APIを呼び直さず
    // 既存の翻訳キャッシュをそのまま使い回す（無料APIの利用量節約のため）。
    const { data: existingRow } = await supabase
      .from("reservations")
      .select("destination, purpose, input_locale, destination_translated, purpose_translated")
      .eq("id", params.id)
      .maybeSingle();

    const contentUnchanged =
      !!existingRow && existingRow.destination === body.destination && existingRow.purpose === body.purpose;

    const { inputLocale, destinationTranslated, purposeTranslated } = contentUnchanged
      ? {
          inputLocale: existingRow!.input_locale,
          destinationTranslated: existingRow!.destination_translated,
          purposeTranslated: existingRow!.purpose_translated,
        }
      : await translateReservationFields(body.destination, body.purpose);

    const { data, error } = await supabase
      .from("reservations")
      .update({
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
      .eq("id", params.id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (isExclusionViolation(error)) {
        return NextResponse.json({ errors: [dict.validation.overlap] }, { status: 409 });
      }
      throw error;
    }
    if (!data) {
      return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
    }

    return NextResponse.json({ reservation: mapReservationRow(data as ReservationRow) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ errors: [dict.apiErrors.updateFailed] }, { status: 500 });
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
  const dict = getDictionary(getLocale());
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
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ errors: [dict.apiErrors.reservationNotFound] }, { status: 404 });
  }

  if (!isAdmin) {
    if (!requesterName) {
      return NextResponse.json({ errors: [dict.apiErrors.needRequesterName] }, { status: 400 });
    }
    if (requesterName !== existing.employee_name) {
      return NextResponse.json({ errors: [dict.apiErrors.notOwnerOrAdmin] }, { status: 403 });
    }
  }

  const { error } = await supabase.from("reservations").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ errors: [dict.apiErrors.deleteFailed] }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
