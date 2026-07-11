import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getAllVehicles } from "@/lib/vehicles";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const runtime = "nodejs";

// GET /api/vehicles - 車両一覧（ログイン済みの社員なら誰でも閲覧可）
export async function GET() {
  const dict = getDictionary(getLocale());

  const auth = await requireApiUser(dict);
  if (auth.error) return auth.error;

  try {
    const vehicles = await getAllVehicles();
    return NextResponse.json({ vehicles });
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.fetchReservationsFailed] }, { status: 500 });
  }
}
