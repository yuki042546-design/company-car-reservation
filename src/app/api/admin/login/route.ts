import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCookieMaxAgeSeconds,
  isCorrectAdminPassword,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: ["リクエストの形式が正しくありません。"] }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!password || !isCorrectAdminPassword(password)) {
    return NextResponse.json({ errors: ["パスワードが正しくありません。"] }, { status: 401 });
  }

  const token = createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getAdminCookieMaxAgeSeconds(),
  });
  return response;
}
