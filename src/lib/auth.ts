import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Dictionary } from "./i18n/dictionary";
import { mapUserRow, type UserRow } from "./mappers";
import { getSupabaseServerClient } from "./supabaseServer";
import type { AppUser, Role } from "./types";

const ROLE_ORDER: Role[] = ["employee", "vehicle_manager", "system_admin"];

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minimum);
}

/**
 * 現在ログイン中のユーザーを取得する。未ログイン、public.users にまだ
 * プロフィール行が存在しない場合、または Supabase の環境変数が未設定の場合は
 * null を返す（＝未ログイン扱い。安全側に倒すfail-closedな挙動）。
 * ルートレイアウトが全ページでこの関数を呼ぶため、ここで例外を投げると
 * 表紙ページ・使い方ページなど本来認証不要なページまで巻き込んで500になってしまう。
 * 保護対象ページ・APIの実際のアクセス制御はミドルウェアとrequirePageUser/requireApiUserが
 * 別途担っているため、ここは例外を握りつぶして安全側に倒してよい。
 *
 * anon key + Cookie セッションで問い合わせるため RLS がそのまま適用される
 * （users テーブルは「自分の行だけ読める」ポリシーになっている）。
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const { data, error } = await supabase.from("users").select("*").eq("id", authUser.id).maybeSingle();
    if (error || !data) return null;

    return mapUserRow(data as UserRow);
  } catch (err) {
    console.error("getCurrentUser failed (treating as logged out)", err);
    return null;
  }
}

/** Server Component（ページ）用。未ログイン・無効化アカウントは /login へリダイレクトする。 */
export async function requirePageUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user || !user.active) {
    redirect("/login");
  }
  return user;
}

/** Server Component（ページ）用。権限不足の場合は /home へリダイレクトする。 */
export async function requirePageRole(minimum: Role): Promise<AppUser> {
  const user = await requirePageUser();
  if (!roleAtLeast(user.role, minimum)) {
    redirect("/home?error=forbidden");
  }
  return user;
}

type ApiUserResult = { user: AppUser; error?: undefined } | { user?: undefined; error: NextResponse };

/** Route Handler 用。未ログインなら401、無効化アカウントなら403を返す。 */
export async function requireApiUser(dict: Dictionary): Promise<ApiUserResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ errors: [dict.apiErrors.unauthorized] }, { status: 401 }) };
  }
  if (!user.active) {
    return { error: NextResponse.json({ errors: [dict.apiErrors.accountDisabled] }, { status: 403 }) };
  }
  return { user };
}

/** Route Handler 用。指定ロール未満なら403を返す（null なら権限あり）。 */
export function requireApiRole(user: AppUser, minimum: Role, dict: Dictionary): NextResponse | null {
  if (!roleAtLeast(user.role, minimum)) {
    return NextResponse.json({ errors: [dict.apiErrors.forbidden] }, { status: 403 });
  }
  return null;
}

/** 招待可能なメールドメインの許可リスト（system_admin によるユーザー招待時のみ使用）。 */
export function isAllowedEmailDomain(email: string): boolean {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS;
  if (!raw || !raw.trim()) {
    // 未設定の場合は安全側に倒し、誰も招待できないようにする（fail-closed）。
    return false;
  }
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  const allowed = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(domain);
}
