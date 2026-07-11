import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { processPendingDeliveries } from "@/lib/notifications/outbox";

export const runtime = "nodejs";

// GET /api/cron/process-notifications
// Vercel Cron から定期実行される想定のエンドポイント。CRON_SECRET が一致しない
// 呼び出しはすべて401で拒否する（秘密情報のログ出力・外部からの不正起動を防ぐ）。
// vercel.json の crons 設定、および CRON_SECRET の発行方法は README/OPERATIONS.md 参照。
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ errors: ["CRON_SECRET is not configured"] }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ errors: ["unauthorized"] }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  await processPendingDeliveries(supabase);

  return NextResponse.json({ ok: true });
}
