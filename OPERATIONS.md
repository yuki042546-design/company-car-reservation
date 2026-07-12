# 運用手順（OPERATIONS.md）

## 社員（名前リスト）を追加する

1. `/admin` にアクセスし、共有パスワード（`ADMIN_PASSWORD`）でログインする
2. 「社員名リストの管理」セクションで名前・所属部署（任意）・年齢（任意）を入力し追加する
3. 追加した名前は、予約フォームの使用者名プルダウンにすぐ反映される

ログイン機能はないため、招待メールのようなものはない。この名前リストは
「予約フォームでどの名前が選べるか」を管理するだけのもので、アカウントではない。

## 社員（名前リスト）を無効化する

1. `/admin` の「社員名リストの管理」で対象の「無効化」ボタンを押す
2. 無効化された名前は予約フォームの選択肢から外れる（`is_active=false`）
3. 過去の予約データは削除されず、そのまま残る

## 車両情報を変更する

- 現時点では車両情報の編集UIは未実装（`vehicles`テーブル・APIはあるが専用画面がない）。
  当面はSupabaseのTable Editorから直接編集するか、`PATCH /api/vehicles/[id]`を
  管理者セッションのCookie（`/admin`にログイン済みのブラウザ）から直接呼び出すこと。

## 整備を登録する

- 現時点では整備登録の管理画面は未実装。`maintenance_blocks`テーブルへ直接INSERTする
  ことで登録可能（重複チェックはアプリ側の`hasOverlappingMaintenanceBlock`関数と
  排他制約`no_overlapping_maintenance`がDBレベルで働く）。画面からの登録は今後の実装課題。

## バックアップ

- Supabaseダッシュボード → Database → Backups で自動バックアップの設定・確認を行う
- スキーマ変更（`supabase/schema.sql`の追記分）を本番へ適用する前は、必ず手動バックアップ
  （Point-in-time recovery が有効なプランならスナップショット）を取得すること

## 復元手順

1. Supabaseダッシュボードの Backups からリストア用のスナップショットを選択
2. リストアは新しいプロジェクトへ行い、動作確認後に本番切り替えを検討する
   （本番プロジェクトへ直接上書きリストアするのは最終手段とする）
3. リストア後、`.env.local` / Vercel環境変数のURL・キーが新プロジェクトのものと
   一致しているか確認する

## 監査ログの確認

- `/admin` の「監査ログ」セクションで、実行者（「admin」または自己申告の使用者名）・
  操作種別・対象・理由・日時を確認できる
- `/admin` の「操作履歴」セクションは、予約の作成/変更/キャンセルのみを表示する簡易版

## 事故・故障発生時の対応

1. 車両の状態を「利用停止中」に変更する（現状は`PATCH /api/vehicles/[id]`を直接呼ぶ必要あり。
   将来的に管理画面から変更できるようにする予定）
2. 該当する予約に「異常あり」の報告があれば `vehicle_usage_records` を確認する
3. 必要に応じて `maintenance_blocks` に修理期間を登録し、以降の予約を自動的にブロックする
4. 対応が完了したら車両の状態を「利用可能」へ戻す

## 通知障害時の確認

1. `notification_deliveries` テーブルの `status='failed'` の行を確認し、`last_error`列を見る
2. `/api/cron/process-notifications` が定期実行されているか、Vercelのcronログを確認する
3. `CRON_SECRET` が正しく設定されているか確認する（未設定だと500を返し続ける）

## 予約競合エラーの調査

1. 発生時刻付近の `audit_logs`（action = `reservation_create` / `reservation_update`）を確認
2. Supabase の Postgres ログで `no_overlapping_reservations` 制約違反（SQLSTATE 23P01）や
   `maintenance_conflict` エラーが出ていないか確認
3. 対象車両・時間帯の既存予約と整備期間（`maintenance_blocks`）を突き合わせる

## 本番リリース手順

1. `npm run lint && npm run typecheck && npm run test && npm run build` がすべて成功することを確認
2. `supabase/schema.sql` の未適用分を、バックアップ取得後にSupabase SQL Editorで実行
   （既存データへの影響がないか、事前にステージング環境で検証することを強く推奨）
3. Vercelの環境変数に `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` / `CRON_SECRET` を
   追加し、旧`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`ALLOWED_EMAIL_DOMAINS`は削除する
4. デプロイ後、`/admin` にアクセスして共有パスワードでログインできることを確認
5. 予約作成・変更・キャンセル・出発/返却/延長が正しく動作することを確認

## ロールバック手順

1. Vercelのデプロイ履歴から直前の安定版に「Redeploy」する（コード側のロールバックはこれで完了）
2. DBスキーマの変更をロールバックする必要がある場合は、`supabase/schema.sql`内の
   各フェーズのコメントに記載したロールバックSQLを参照する（例: フェーズ2なら
   `vehicles`・`maintenance_blocks`等のDROP文が明記されている）
3. ロールバック前には必ずバックアップを取得すること
