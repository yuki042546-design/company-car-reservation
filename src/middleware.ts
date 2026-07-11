import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 認証不要でアクセスできる最小限の公開ページ。
// これ以外のページ・APIはすべてログイン必須（ミドルウェアで一次防御し、
// 各ページ・Route Handler側でも requireApiUser/requirePageUser により再確認する）。
const PUBLIC_PATHS = new Set(["/", "/guide", "/login", "/auth/set-password"]);

// セッションCookieではなく独自の秘密情報（CRON_SECRET等）で保護されているAPI。
// ミドルウェアのログインチェックは通すが、実際の認可は各エンドポイント自身が行う。
const PUBLIC_API_PREFIXES = ["/api/cron/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  // 環境変数が未設定の場合は認証状態を確認できないため、安全側に倒して
  // 保護対象パスへのアクセスをすべて拒否する（fail-closed。開発用の抜け道は作らない）。
  if (!url || !anonKey) {
    if (!isPublicPath(pathname)) {
      return NextResponse.json(
        { errors: ["サーバー設定エラー: 認証が構成されていません（Supabase の環境変数未設定）。"] },
        { status: 500 }
      );
    }
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // セッショントークンの自動リフレッシュ（有効期限切れによる予期しないログアウトを防ぐ）。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ errors: ["ログインが必要です。"] }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 社内向けアプリのため、全ページを検索エンジンのインデックス対象から除外する。
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
