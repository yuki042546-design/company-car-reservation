# セキュリティ設計（SECURITY.md）

## 1. 認証方式

- **Supabase Auth**（メールアドレス + パスワード）を使用。
- **招待制**: 自己サインアップは想定していない。system_admin が `POST /api/users` から
  `supabase.auth.admin.inviteUserByEmail()` を呼び、招待メール内のリンクから
  `/auth/set-password` でパスワードを設定してもらう。
- **重要な手動設定**: Supabaseダッシュボード → Authentication → Providers → Email →
  「Enable email signups」を無効化すること。これを怠ると、理論上は誰でも自己サインアップ
  できてしまう（アプリのUIには登録フォームがないため実際に使われる可能性は低いが、
  Supabase Auth APIを直接叩けば登録できてしまうため、必ず無効化が必要）。
- パスワードの最小長は8文字（`SetPasswordForm.tsx`）。それ以上の複雑性要件は
  Supabase Auth側の設定に委ねている。
- **MFA**: Supabase AuthはTOTPベースのMFAをサポートしている
  （Authentication → Providers → Multi-Factor Authentication）。本アプリのUIからは
  現時点でMFA登録フローを提供していないため、必要な場合はSupabaseダッシュボードの
  設定を有効にした上で、別途MFA登録UIを追加する必要がある（未実装）。

## 2. 認可方式

- **ロール**: `employee` < `vehicle_manager` < `system_admin`（`src/lib/auth.ts` の `roleAtLeast`）。
- **多層防御**:
  1. `src/middleware.ts` — Cookieセッションの有無だけを見る一次防御。未ログインなら
     ページは `/login` へリダイレクト、APIは401 JSONを返す。
  2. 各ページ（Server Component）で `requirePageUser()` / `requirePageRole()` を呼び、
     ユーザーの `active` フラグとロールを再確認する。
  3. 各 Route Handler で `requireApiUser()` / `requireApiRole()` を呼び、同様に再確認する。
  4. 所有者チェック（`owner_user_id === currentUser.id`）を、予約の変更・キャンセル・
     出発・返却・延長の各APIで個別に行う。
- **画面からボタンを隠すだけに頼っていない**: 例えば予約変更APIは、フロントエンドが
  「変更」ボタンを表示しているかどうかに関わらず、サーバー側で所有者・ステータス・
  ロールを再検証する。
- **HTTPステータス**: 未ログイン=401、権限不足=403、対象なし=404、予約競合=409、
  入力不正=400 を一貫して使用（`src/app/api/**/route.ts` 参照）。

## 3. DB権限制御（RLS）

- 全テーブルで Row Level Security を有効化。
- `reservations` / `employees` / `reservation_logs` / Tier2テーブル（notifications等）は
  ポリシーを一切作成せず anon/authenticated からの直接アクセスを完全ブロック
  （アプリは常にservice roleキー経由でアクセスするため）。
- `users` / `vehicles` / `maintenance_blocks` / `vehicle_usage_records` / `app_settings` /
  `audit_logs` には実際に機能するRLSポリシーがある
  （`lib/auth.ts` の `getCurrentUser()` が anon key + セッションで `users` テーブルを
  直接読むため、これらは「アプリの動作を左右する」ポリシー）。
- **設計上の注意**: 上記以外のほとんどのデータアクセスはservice roleキー経由（RLSをバイパス）
  で行っている。これは「RLSだけで守る」のではなく「アプリケーション層の認可を主、
  RLSを défense-in-depth（多層防御の一環）」とする意図的な設計判断。理由は、
  既存コードベースが最初からservice role中心の設計だったため、全クエリをRLS前提の
  ユーザーセッションクライアントへ置き換える大改修を避けつつ、それでも
  「サーバー側で認可を必ず確認する」という要件は満たすため。
- `service role key` はサーバー側（`src/lib/supabaseAdmin.ts`）でのみ使用し、
  `NEXT_PUBLIC_` プレフィックスを付けていないため、ブラウザには一切公開されない。

## 4. 入力検証

- `src/lib/reservationRules.ts`: 必須項目・30分単位・過去日時不可・最短/最大利用時間
  （`app_settings`から取得、system_adminが変更可能）・予約可能期間・文字数制限
  （行き先200字、用途200字、備考1000字）をサーバー側で検証。
- React は既定でHTMLエスケープを行うため、ユーザー入力をXSSベクタとして
  そのままレンダリングする箇所はない（`dangerouslySetInnerHTML`は使用していない）。
- SQLインジェクション: 生のSQL文字列組み立てはせず、`@supabase/supabase-js` の
  クエリビルダー、またはパラメータ化されたRPC呼び出し（`supabase.rpc(...)`）のみを使用。

## 5. 予約重複防止（多層）

1. アプリ側の事前チェック（`hasOverlappingReservation` / `hasOverlappingMaintenanceBlock`）
2. `create_reservation_tx` / `update_reservation_tx` RPC内の `pg_advisory_xact_lock`
   による車両単位の同時実行の直列化（整備期間チェック用）
3. `no_overlapping_reservations` 排他制約（`vehicle_id` + 時間範囲 + ステータス限定）が
   最終防衛ライン。2人が同時に同じ枠を予約しても、片方はDBレベルで確実に拒否される。

## 6. 既知の制約・残っているセキュリティ課題

- レガシー予約（`owner_user_id`が`null`の移行前データ）の削除・変更は、
  `vehicle_manager`以上のみに制限しているため、一般社員が過去の自分の予約を
  自己申告で操作する経路（旧`requesterName`方式）は**キャンセルのみ**残している。
  これは意図的な設計判断（本人確認の手段がないレガシーデータの安全側対応）。
- レート制限（ログイン試行回数の制限等）は未実装。Supabase Auth自体には
  ある程度のブルートフォース対策があるとされるが、アプリ側での追加のレート制限は
  今後の課題。
- CSRF対策は、Supabase AuthのCookieが`SameSite`属性を持つことと、状態変更APIが
  すべてJSON POST/PUT/PATCH/DELETE（フォーム送信ではない）であることに依拠している。
  追加のCSRFトークンは実装していない。
- セキュリティヘッダー（CSP等）は `X-Robots-Tag` 以外は未設定。今後の課題。
- 依存ライブラリの脆弱性: `npm audit` で Next.js 14.2.35 に既知の脆弱性が複数報告されている
  （詳細はIMPLEMENTATION_STATUS.mdおよびコミットログ参照）。Next.js 15/16への
  アップグレードは破壊的変更を伴うため、本セッションでは実施していない。
  別途計画的なアップグレード作業を推奨する。
- 通知機能の実配信は未検証（外部認証情報待ち）。

## 7. 秘密情報の管理

- `.env.local`（gitignore対象）にのみ実際の値を保存。`.env.local.example`には
  変数名と説明のみを記載し、実際の値は書かない。
- `SUPABASE_SERVICE_ROLE_KEY` / `CRON_SECRET` はサーバー側環境変数としてのみ扱い、
  ログや監査ログ（`audit_logs`）には出力しない。
- 監査ログには操作内容（before/after データ）を保存するが、パスワードや
  トークンなどの秘密情報を含むフィールドは記録対象にしていない。

## 8. インシデント発生時の確認箇所

1. `audit_logs` テーブル（管理画面の「監査ログ」）で、誰が・いつ・何をしたかを確認
2. `reservation_logs` テーブル（管理画面の「操作履歴」）で予約の作成/変更/キャンセルを確認
3. Supabaseダッシュボードの Authentication > Users でログイン履歴・アカウント状態を確認
4. Vercelのデプロイログ・Function実行ログでAPIエラーを確認
5. 車両の状態（`vehicles.status`）と直近の `vehicle_usage_records` を確認
