import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCookieMaxAgeSeconds,
  isCorrectAdminPassword,
} from "@/lib/adminAuth";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const dict = getDictionary(getLocale());

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [dict.apiErrors.invalidRequestBody] }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!password || !isCorrectAdminPassword(password)) {
    return NextResponse.json({ errors: [dict.apiErrors.wrongPassword] }, { status: 401 });
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
