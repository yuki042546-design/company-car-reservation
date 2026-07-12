# セキュリティ設計（SECURITY.md）

## 1. 認証方式

- **一般社員向けの個人ログインはない。** 予約は使用者名（`employee_name`）を
  リストから選ぶ自己申告方式で識別する（`src/components/EmployeeCombobox.tsx`）。
- **管理者ページ（`/admin`）のみ共有パスワードで保護**する。仕組みは
  `src/lib/adminAuth.ts` / `src/lib/requireAdmin.ts`:
  - `ADMIN_PASSWORD`（環境変数）と入力値を `crypto.timingSafeEqual` で比較。
  - ログイン成功時、有効期限（8時間）を含むペイロードを `ADMIN_SESSION_SECRET`で
    HMAC-SHA256署名したトークンを発行し、`httpOnly` Cookie（`admin_session`）に保存。
  - 各管理者専用ページ/APIは `isAdminRequest()` を呼び、Cookieの署名・有効期限を
    その都度検証する（セッション自体にユーザー識別情報は含まれない＝個人アカウントではない）。
- ログイン試行回数の制限（レート制限・ロックアウト）は未実装。

## 2. 認可方式

- ロールという概念はなく、「管理者（`isAdminRequest()`が真）」と「それ以外」の二値のみ。
- 各 API ルートの先頭で `isAdminRequest()` を呼び、管理者専用の操作（車両情報変更・
  整備登録・社員追加/編集）はここで401を返して拒否する。
- 予約の変更・キャンセルは、送信された `requesterName` が予約の `employee_name` と
  一致する場合のみ本人として許可し、一致しない場合は管理者のみ操作できる
  （`src/app/api/reservations/[id]/route.ts`）。自己申告ベースの本人確認であり、
  他人の名前を偽って選択すれば技術的には操作できてしまうが、予約登録時に誰でも
  任意の使用者名を選べる設計と同じ信頼レベルであり、社内10名程度の運用における
  実用上の割り切りである。
- 出発・返却・延長・異常報告（`POST /api/reservations/[id]/action`）は、車両を
  物理的に操作している人が行う前提の操作のため、誰でも実行できる（同じ信頼モデル）。
- **画面からボタンを隠すだけに頼っていない**: フロントエンドの表示状態に関わらず、
  サーバー側で管理者判定・自己申告一致・ステータスを再検証する。
- **HTTPステータス**: 管理者権限が必要な操作への未認証アクセス=401、本人・管理者
  どちらでもない=403、対象なし=404、予約競合=409、入力不正=400 を一貫して使用
  （`src/app/api/**/route.ts` 参照）。

## 3. DB権限制御（RLS）

- 全テーブルで Row Level Security を有効化。
- ログイン機能がなく、ブラウザから anon key でSupabaseへ直接アクセスすることも
  ないため、**全テーブルでポリシーを一切作成せず**、anon/authenticated からの
  直接アクセスを完全ブロックしている。
- アプリのデータアクセスはすべて service role key（`src/lib/supabaseAdmin.ts`）
  経由で行い、RLSをバイパスする。認可はアプリケーション層（`isAdminRequest()` /
  自己申告名の一致確認）で行う設計。
- `service role key` はサーバー側でのみ使用し、`NEXT_PUBLIC_` プレフィックスを
  付けていないため、ブラウザには一切公開されない。
- `public.users` テーブルと、それに紐づくRLSポリシー・Supabase Authの設定は、
  過去のSupabase Auth移行の名残としてDBに残っているが、アプリからは一切参照
  していない（無効化・削除は行っていない。将来的に不要なら手動で削除可能）。

## 4. 入力検証

- `src/lib/reservationRules.ts`: 必須項目・30分単位・過去日時不可・最短/最大利用時間
  （`app_settings`から取得、管理者が変更可能）・予約可能期間・文字数制限
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

- 自己申告ベースの本人確認（`requesterName`）は、社内少人数運用を前提とした
  意図的な割り切りであり、なりすまし自体を技術的に防ぐものではない。
- `ADMIN_PASSWORD` はアプリ利用者全員（管理者権限を持つ1〜数名）で共有する
  単一パスワードであり、個人単位の失効・監査はできない。
- レート制限（管理者ログイン試行回数の制限等）は未実装。
- CSRF対策は、状態変更APIがすべてJSON POST/PUT/PATCH/DELETE（フォーム送信では
  ない）であることに主に依拠している。追加のCSRFトークンは実装していない。
- セキュリティヘッダー（CSP等）は未設定（`X-Robots-Tag` はミドルウェア削除に伴い
  `layout.tsx`の`metadata.robots`のみで対応）。今後の課題。
- 依存ライブラリの脆弱性: `npm audit` で Next.js 14.2.35 に既知の脆弱性が複数報告されている
  （詳細はIMPLEMENTATION_STATUS.mdおよびコミットログ参照）。Next.js 15/16への
  アップグレードは破壊的変更を伴うため、本セッションでは実施していない。
  別途計画的なアップグレード作業を推奨する。
- 通知機能の実配信は未検証（外部認証情報待ち）。

## 7. 秘密情報の管理

- `.env.local`（gitignore対象）にのみ実際の値を保存。`.env.local.example`には
  変数名と説明のみを記載し、実際の値は書かない。
- `SUPABASE_SERVICE_ROLE_KEY` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` /
  `CRON_SECRET` はサーバー側環境変数としてのみ扱い、ログや監査ログ
  （`audit_logs`）には出力しない。
- 監査ログには操作内容（before/after データ）を保存するが、パスワードや
  トークンなどの秘密情報を含むフィールドは記録対象にしていない。

## 8. インシデント発生時の確認箇所

1. `audit_logs` テーブル（管理画面の「監査ログ」）で、いつ・何をしたかを確認
   （実行者は「admin」または自己申告の使用者名として記録される）
2. `reservation_logs` テーブル（管理画面の「操作履歴」）で予約の作成/変更/キャンセルを確認
3. Vercelのデプロイログ・Function実行ログでAPIエラーを確認
4. 車両の状態（`vehicles.status`）と直近の `vehicle_usage_records` を確認
