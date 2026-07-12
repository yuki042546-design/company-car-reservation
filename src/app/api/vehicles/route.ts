import { NextResponse } from "next/server";
import { getAllVehicles } from "@/lib/vehicles";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const runtime = "nodejs";

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
