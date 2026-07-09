import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/requireAdmin";

export const runtime = "nodejs";

// 管理者としてログイン済みかどうかを確認する（管理画面の初期表示判定に使用）
export async function GET() {
  return NextResponse.json({ isAdmin: isAdminRequest() });
}
