# 社用車予約Webアプリ

会社が保有する社用車を、社員だけがログインして安全に予約・利用管理できる社内システムです。Next.js (App Router) + TypeScript + Supabase (Postgres + Auth) で構築しています。将来的に車両が複数台に増えても作り直しが不要なデータ構造になっています。

詳しい実装状況（完了/未完了の切り分け）は [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)、セキュリティ設計は [SECURITY.md](SECURITY.md)、運用手順は [OPERATIONS.md](OPERATIONS.md) を参照してください。

## 主な機能

- **認証・権限**: Supabase Auth（メール/パスワード、招待制）によるログイン。共有パスワードは廃止し、社員ごとの個人アカウントで `employee` / `vehicle_manager` / `system_admin` の3ロールを持つ
- **ホーム画面**: 車両の現在状態（利用可能/使用中/整備中/利用停止中）を最上部に表示。使用中なら利用者・返却予定時刻・行き先、利用可能なら次の予約と鍵の保管場所を表示
- 予約登録・変更・キャンセル（開始前のみ本人が操作可。開始後の訂正は管理者のみ、理由入力必須）
- 出発・返却・延長・異常報告（予約のステータスを`reserved→in_use→completed`等で管理）
- トップページは大きな月間カレンダー表示。該当日をタップして選択→もう一度タップで新規予約画面へ
- カレンダーは「詳細な時間」（ガントチャート）表示と切替可能。今日の予約リストは常に表示
- 予約時間ルールの検証（30分単位、最短/最大利用時間・予約可能期間は管理設定で変更可）
- 予約重複防止（アプリ側 + DBの排他制約 + アドバイザリーロックによる多層防御。車両×整備期間との重複も防止）
- 予約・変更・キャンセル・出発・返却・延長・権限変更等の監査ログ（管理者ページで閲覧可能）
- 社員名リスト（レガシー）・ユーザー管理（招待・権限変更・無効化）
- 日本語 / ベトナム語の言語切替、行き先・用途の自動翻訳
- 通知機能（outbox方式）。社内で利用しているMicrosoft Teamsへのincoming webhook通知に対応（Slack例も同梱）
- スマホ対応のレスポンシブUI

---

## 1. ローカルで起動する手順

```bash
# 1. 依存パッケージをインストール
npm install

# 2. 環境変数ファイルを作成
cp .env.local.example .env.local
# .env.local を開き、Supabase の値などを設定する（詳細は下記「環境変数」参照）

# 3. Supabase 側でテーブルを作成する（下記「Supabaseのテーブル定義」参照）

# 4. Supabaseダッシュボードで Authentication > Providers > Email >
#    「Enable email signups」を無効化する（招待制を徹底するため。SECURITY.md参照）

# 5. 開発サーバーを起動
npm run dev

# 6. 最初の system_admin アカウントを作る（下記「初期セットアップ」参照）
```

ブラウザで `http://localhost:3000` を開くと確認できます。スマホ実機で確認したい場合は、`npm run dev -- -H 0.0.0.0` などでLAN内からアクセスしてください。

### 初期セットアップ（最初の管理者アカウント）

招待は`system_admin`しか行えないため、最初の1人だけはSQLで直接作成する必要があります。

1. Supabaseダッシュボード → Authentication → Users → 「Add user」で自分のメールアドレスを使い、パスワード付きでユーザーを作成する（招待メールではなく直接作成でよい）
2. SQL Editorで、作成したユーザーの`public.users`行を`system_admin`に更新する:
   ```sql
   update users set role = 'system_admin' where email = 'you@example.co.jp';
   ```
3. 作成したメールアドレス・パスワードで `/login` からログインし、`/admin` の「ユーザー管理」から他のメンバーを招待する

### 初期車両の設定

`supabase/schema.sql` を実行すると、車両マスタ（`vehicles`）に「社用車」という名前で1台自動登録され、既存予約すべてにその車両IDが割り当てられます。実際の車名・ナンバー・鍵の保管場所などは、Supabase Table Editorから`vehicles`テーブルの当該行を直接編集してください（専用の管理画面は未実装。[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)参照）。

---

## 2. Supabaseで作成するテーブル定義

Supabase プロジェクトの **SQL Editor** で [`supabase/schema.sql`](supabase/schema.sql) の内容をそのまま実行してください。ファイル内はフェーズごとにコメントで区切られており、各フェーズの先頭にロールバック方法・事前確認事項を記載しています。**本番へ適用する前には必ずバックアップを取得してください。**

テーブル構成の全体像（ER図）は [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) を参照してください。主なテーブル:

| テーブル | 役割 |
| --- | --- |
| `users` | 認証済み社員のプロフィール・権限（`auth.users`と1:1連携） |
| `vehicles` | 車両マスタ（現状は1台、将来複数台に対応可能な構造） |
| `reservations` | 予約（車両・所有者・ステータスを保持） |
| `vehicle_usage_records` | 出発・返却時の実車記録 |
| `maintenance_blocks` | 整備・利用停止期間 |
| `audit_logs` | 監査ログ（誰が・いつ・何を・なぜ変更したか） |
| `app_settings` | 予約ルールの上限値等の運用設定（1行のみ） |
| `employees` | 【レガシー】社員名マスタ。互換性のため残置 |
| `reservation_logs` | 【レガシー】予約の簡易操作履歴。互換性のため残置 |
| `notifications` / `notification_deliveries` | 通知outbox（実配信は未実装、IMPLEMENTATION_STATUS.md参照） |
| `favorite_destinations` / `waitlist_entries` / `recurring_reservation_rules` | 将来機能向けのスキーマのみ（UI未実装） |

以下は移行前から存在する `reservations` / `employees` テーブルの詳細です（新規追加列は上記ER図参照）。

### `reservations` テーブル（予約）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid (PK) | 予約ID（自動採番） |
| `employee_name` | text | 使用者名 |
| `start_time` | timestamptz | 開始日時 |
| `end_time` | timestamptz | 終了日時 |
| `destination` | text | 行き先 |
| `purpose` | text | 用途 |
| `note` | text (null可) | 備考 |
| `input_locale` | text | 行き先・用途が入力された言語（`ja`または`vi`、サーバー側で自動判定） |
| `destination_translated` | text (null可) | 行き先の翻訳キャッシュ（`input_locale`とは逆の言語。翻訳失敗時はnull） |
| `purpose_translated` | text (null可) | 用途の翻訳キャッシュ（同上） |
| `created_at` | timestamptz | 作成日時（自動） |
| `updated_at` | timestamptz | 更新日時（自動更新） |

制約:
- `end_after_start`: `end_time > start_time` を強制
- `no_overlapping_reservations`: `tstzrange(start_time, end_time, '[)')` の **EXCLUDE制約**により、同時刻の重複予約をDBレベルで拒否（詳細は後述）

> 既にテーブルを作成済みの場合は、以下のマイグレーションを実行してください（[schema.sql](supabase/schema.sql)に含まれています）。
> ```sql
> alter table reservations add column if not exists input_locale text not null default 'ja';
> alter table reservations add column if not exists destination_translated text;
> alter table reservations add column if not exists purpose_translated text;
> ```

### `employees` テーブル（社員名マスタ）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid (PK) | 社員ID |
| `name` | text | 社員名 |
| `department` | text (null可) | 所属部署（任意） |
| `age` | integer (null可) | 年齢（任意、15〜100の範囲はAPI側でチェック） |
| `is_active` | boolean | 予約フォームの選択肢に表示するかどうか（デフォルト true） |
| `created_at` | timestamptz | 作成日時 |

初期データとして「社員A」〜「社員J」の10名が投入されます。社員の追加・名前や所属部署・年齢の編集・無効化は、管理者ページ（`/admin`）の「社員名リストの管理」からすべて行えます（削除ではなく `is_active` フラグで無効化する方式のため、過去の予約データとの整合性が保たれます）。

### `reservation_logs` テーブル（予約の操作履歴）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid (PK) | 履歴ID |
| `action` | text | `create`（予約）/ `update`（変更）/ `delete`（削除） |
| `employee_name` | text | 対象予約の使用者名 |
| `reservation_start_time` / `reservation_end_time` | timestamptz | 対象予約の開始/終了日時（削除後も履歴に残すためのスナップショット） |
| `reservation_destination` | text | 対象予約の行き先（同上） |
| `created_at` | timestamptz | 操作日時（管理者ページには分単位まで表示） |

予約の登録・変更・削除（`POST`/`PUT`/`DELETE` /api/reservations）の際に自動で記録され、管理者ページ（`/admin`）の「操作履歴」から閲覧できます。書き込みに失敗しても予約本体の操作は失敗しません。

> 既にテーブルを作成済みの場合は、`department` / `age` カラムを追加するマイグレーションを実行してください（[schema.sql](supabase/schema.sql)に含まれています）。
> ```sql
> alter table employees add column if not exists department text;
> alter table employees add column if not exists age integer;
> ```

### RLS（Row Level Security）について

このアプリはブラウザから直接 Supabase を呼び出さず、**基本的に Next.js の API ルート（サーバー側・service role key）を経由**します。そのため大半のテーブルはRLSを有効化した上でポリシーを一切作成せず、anon キーによる直接アクセスを完全にブロックしています。一方、`users` / `vehicles` / `maintenance_blocks` / `vehicle_usage_records` / `app_settings` / `audit_logs` には実際に機能するRLSポリシーがあります（ログイン確認処理が anon key + セッションで `users` テーブルを直接読むため）。詳細は [SECURITY.md](SECURITY.md) を参照してください。

---

## 3. 環境変数の設定方法

`.env.local`（ローカル）または Vercel の Environment Variables（本番）に以下を設定してください。`.env.local.example` をコピーして使うと簡単です。

| 変数名 | 説明 | 取得方法 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Supabase ダッシュボード → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon/public key | 同上（ブラウザに公開される前提のキー。RLSで保護） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の service role key（**秘密情報**） | 同上（`service_role` の値。絶対にクライアントに公開しないこと） |
| `ALLOWED_EMAIL_DOMAINS` | ユーザー招待を許可するメールドメイン（カンマ区切り） | 例: `example.co.jp,group-example.co.jp`。未設定だと誰も招待できません |
| `CRON_SECRET` | Vercel Cronから通知処理エンドポイントを呼び出す際の認証秘密文字列 | `openssl rand -hex 32` などで生成（任意、通知機能を使う場合のみ） |
| `TEAMS_WEBHOOK_URL` | Microsoft Teamsの通知チャネルに設定したIncoming Webhook URL（任意） | Teamsのチャネル → コネクタ → Incoming Webhook で発行 |
| `SLACK_WEBHOOK_URL` | Slack通知を使う場合のIncoming Webhook URL（任意） | Slack側で発行 |

> **注意**: `SUPABASE_SERVICE_ROLE_KEY` は全テーブルへのフルアクセス権を持つ強力なキーです。`NEXT_PUBLIC_` を付けていないため、ブラウザには一切送信されず、サーバーサイド（API ルート）でのみ使用されます。Gitにコミットしないでください（`.gitignore` で `.env*.local` は除外済みです）。
>
> **旧・共有パスワード方式（`ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET`）はSupabase Auth移行に伴い廃止しました。** `.env.local`に残っていても読み込まれないため、削除してください。

---

## 4. Vercelに公開するための手順

1. このプロジェクトを GitHub 等のリポジトリにプッシュする
2. [Vercel](https://vercel.com/) でリポジトリを Import する
3. Vercel の **Project Settings → Environment Variables** に、上記「環境変数」を設定する（`CRON_SECRET`/`TEAMS_WEBHOOK_URL`/`SLACK_WEBHOOK_URL`は通知機能を使う場合のみ）
4. Deploy を実行する
5. デプロイ完了後、発行された URL にアクセスして動作確認する（未ログイン状態では `/` `/guide` `/login` 以外にアクセスできないことを確認）

Vercel はプルリクエストごとにプレビュー環境を作成できます。環境変数はプレビュー用と本番用で同じ Supabase プロジェクトを共用しても問題ありません（社内ツールのため）。`vercel.json` に通知処理用のCron設定（15分毎）が含まれています。

---

## 4.5. テスト

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript の型チェック
npm run test        # Vitest によるユニットテスト（予約バリデーション・状態遷移・権限判定など）
npm run test:e2e    # Playwright（要: 起動中の開発サーバー。認証込みフローは未実装、詳細はIMPLEMENTATION_STATUS.md）
npm run build       # 本番ビルド
```

---

## 5. 主要なファイル構成

```
src/
  middleware.ts                    認証の一次防御（未ログインをリダイレクト/401、noindexヘッダー付与）
  app/
    page.tsx                       表紙ページ（認証不要）
    login/page.tsx                 ログインページ
    auth/set-password/page.tsx     招待・パスワード再設定リンクの受け皿
    home/page.tsx                  ログイン後トップ（車両状態バナー、カレンダー/詳細な時間、今日/今週の予約）
    guide/page.tsx                 使い方ページ（認証不要）
    layout.tsx                     全体レイアウト・ヘッダー
    globals.css                    Tailwind の読み込み・共通スタイル
    reservations/
      page.tsx                     全予約一覧（日付ごとにグループ表示）
      new/page.tsx                 新規予約フォーム
      [id]/edit/page.tsx           予約変更フォーム
    admin/
      page.tsx                     管理者ページ（vehicle_manager以上のみ）
    api/
      reservations/route.ts        GET(一覧) / POST(新規登録・アトミック)
      reservations/[id]/route.ts   GET(単体) / PUT(変更・訂正) / DELETE(キャンセル)
      reservations/[id]/action/route.ts  POST(出発・返却・延長・異常報告)
      vehicles/route.ts            GET(車両一覧)
      vehicles/[id]/route.ts       PATCH(車両情報・状態変更・vehicle_manager以上)
      users/route.ts               GET(ユーザー一覧) / POST(招待・system_adminのみ)
      users/[id]/route.ts          PATCH(権限・有効/無効・運転資格・system_adminのみ)
      employees/route.ts           GET(社員一覧・レガシー) / POST(追加・vehicle_manager以上)
      employees/[id]/route.ts      PATCH(編集・有効/無効切替・vehicle_manager以上)
      cron/process-notifications/route.ts  通知outboxの処理（CRON_SECRET保護）
  components/
    LoginForm.tsx / SetPasswordForm.tsx / LogoutButton.tsx  認証UI
    VehicleStatusBanner.tsx        ホーム画面の車両状態表示・出発/返却/延長ボタン
    UserManager.tsx                ユーザー招待・権限変更UI
    AdminAuditLog.tsx              監査ログ表示（管理者ページ）
    ReservationForm.tsx            予約登録・変更フォーム（新規/編集で共用）
    ReservationCard.tsx            予約1件分の表示カード（ステータスバッジ付き）
    TopScheduleToggle.tsx / MonthCalendar.tsx / TodayGanttChart.tsx  カレンダー・詳細な時間表示
    AdminReservationList.tsx       管理者向け予約一覧（複数選択・一括キャンセル）
    AdminOperationHistory.tsx      予約の簡易操作履歴（レガシー）
    EmployeeManager.tsx            社員名リスト管理UI（レガシー）
  lib/
    auth.ts                        現在ユーザー取得・ロール判定・ページ/API用の認可ヘルパー
    supabaseServer.ts / supabaseBrowser.ts  RLSが効くSupabaseクライアント（anon key）
    supabaseAdmin.ts                Supabase サーバークライアント（service role、RLSバイパス）
    reservationStatus.ts           予約・車両のステータス遷移ルール
    auditLog.ts                    監査ログ書き込みヘルパー
    vehicles.ts                    車両データ取得
    notifications/                 通知プロバイダーのインターフェース・outbox・登録
    types.ts / mappers.ts          型定義・DB(snake_case)⇔アプリ内(camelCase)の変換
    reservationRules.ts            予約時間ルールの検証ロジック
    overlapCheck.ts                予約重複・整備期間重複のチェック
    data.ts                        サーバーコンポーネント用のデータ取得関数
    dateUtils.ts                   日時フォーマット・今日/今週/月間の範囲計算（Asia/Tokyo固定）
    *.test.ts                      Vitestのユニットテスト
supabase/
  schema.sql                       テーブル定義（Supabase SQL Editorで実行、フェーズごとにコメントで区切り）
e2e/
  public-pages.spec.ts             Playwrightのスモークテスト（認証不要ページのみ）
```

### 将来の拡張を見据えた設計

- **Googleカレンダー連携**: `src/lib/data.ts` と `src/app/api/reservations/*` がデータアクセスの唯一の入口になっているため、将来カレンダー同期を追加する場合はこの層にフックを足すだけで済みます（UIコンポーネント側の変更は不要）。
- **複数車両対応**: `reservations` テーブルに `vehicle_id` カラムを足し、重複チェックのクエリに `vehicle_id` の絞り込みを1行追加するだけで対応できる構成にしています。
- **本格的な社員ログイン**: 現在は社員名をテキストとして保存していますが、`employees` テーブルが既に存在するため、将来的に `employee_id` の外部キーへ差し替えることも容易です。

---

## 6. 予約重複チェックの仕組み

要件どおり、以下の条件を満たす場合に「重複」と判定します。

```
新しい予約の開始時刻 < 既存予約の終了時刻
かつ
新しい予約の終了時刻 > 既存予約の開始時刻
```

この判定を **2箇所** で行うことで、通常利用時のわかりやすいエラー表示と、同時アクセス時のデータ不整合防止の両方を実現しています。

### ① アプリケーション側（事前チェック・わかりやすいエラーメッセージ用）

[`src/lib/overlapCheck.ts`](src/lib/overlapCheck.ts) の `hasOverlappingReservation()` が、Supabase に対して

```ts
supabase
  .from("reservations")
  .select("id", { count: "exact", head: true })
  .lt("start_time", newEnd)   // 既存の終了 > 新規の開始 ではなく
  .gt("end_time", newStart)   // 既存の start < newEnd かつ end > newStart
```

という問い合わせを行い、該当する予約が1件でもあれば登録・変更を拒否し、「この時間帯はすでに予約が入っています。」というエラーを返します（[`POST /api/reservations`](src/app/api/reservations/route.ts) と [`PUT /api/reservations/[id]`](<src/app/api/reservations/[id]/route.ts>) の両方で使用）。編集時は自分自身の予約IDを除外して判定します。

### ② データベース側（最終防衛ライン・同時登録対策）

2人が同時刻に同じ枠を予約しようとした場合、①のチェックだけでは「チェック直後に相手が先に登録してしまう」というレースコンディションが起こり得ます。これを防ぐため、`reservations` テーブルには PostgreSQL の **EXCLUDE制約** を設定しています（[`supabase/schema.sql`](supabase/schema.sql)）。

```sql
constraint no_overlapping_reservations exclude using gist (
  tstzrange(start_time, end_time, '[)') with &&
)
```

`tstzrange(start_time, end_time, '[)')` は「開始を含み、終了を含まない」時間区間を表すため、9:00〜11:00 と 11:00〜12:00 のように端が接するだけの予約は重複と判定されません（要件の例どおり）。この制約に違反する `INSERT`/`UPDATE` は PostgreSQL 側でエラー（`23P01`）として拒否され、API ルートはこれを検知して同じエラーメッセージをユーザーに返します。

---

## 7. 予約時間ルールの実装場所

[`src/lib/reservationRules.ts`](src/lib/reservationRules.ts) の `validateReservationInput()` に、以下のルールをまとめて実装しています（フォーム側の即時チェックとAPIルート側の最終チェックの両方から、同じ関数を呼び出しています）。

- 必須項目チェック（使用者名・開始日時・終了日時・行き先・用途）
- 30分単位チェック（開始・終了とも分が0または30であること）
- 過去日時チェック
- 終了 > 開始チェック
- 使用時間 30分以上 / 4時間以内チェック

---

## 8. 社員名リストの変更方法

初期状態では「社員A」〜「社員J」が登録されていますが、実際の氏名への変更や増減は以下のいずれかで行えます。

- **管理者ページ（`/admin`）から**: 社員の追加・無効化がGUIから可能です（推奨）
- **Supabase の Table Editor から直接編集**: `employees` テーブルの `name` を直接書き換えることも可能です

社員名を変更しても過去の予約データ（`reservations.employee_name`）は当時の名前のまま保持されます。

---

## 9. 予約のキャンセル・訂正の権限について

予約は物理削除せず、`status='cancelled'`への更新として扱います（過去の記録は残ります）。`DELETE /api/reservations/[id]` は内部的にこのキャンセル処理を行うエンドポイント名として残しています。

- **予約した本人**（`owner_user_id`が自分のもの）: 開始前（`status='reserved'`）の自分の予約に限り、変更・キャンセルができます。開始後は変更・キャンセルできません。
- **管理者（`vehicle_manager`以上）**: どの予約でも変更・キャンセルできます。開始後の予約を訂正する場合、または誰かの予約をキャンセルする場合は、理由の入力が必須です。訂正・キャンセルの内容（変更前後・理由・実行者）は監査ログ（`audit_logs`）に記録されます。
- **移行前のレガシー予約**（`owner_user_id`が未割当）: 本人確認の手段がないため、`vehicle_manager`以上のみが変更・割当を行えます（旧`employee_name`による自己申告でのキャンセルのみ、互換性維持のため許可）。
- **他人の予約**: 一般社員が自分以外の予約を変更・キャンセルしようとした場合は、サーバー側で`owner_user_id`と突き合わせて`403`を返し拒否します（[`src/app/api/reservations/[id]/route.ts`](<src/app/api/reservations/[id]/route.ts>)）。

自己申告ベースの本人確認であり、他人の名前を偽って選択すれば技術的には削除できてしまいますが、これは予約登録・変更時に誰でも任意の使用者名を選べる現在の設計と同じ信頼レベルであり、社内10名程度の運用における実用上の割り切りです。より厳密にしたい場合は、`requesterName` による自己申告を実際の社員ログイン（将来的な拡張）に置き換えるだけで済むよう、判定ロジックは API ルート1箇所（`DELETE` ハンドラ）にまとまっています。

---

## 10. 日時入力・使用者名入力のUI

- **開始/終了日時**（[`src/components/DateTimeSelect.tsx`](src/components/DateTimeSelect.tsx)）: 日付はカレンダー入力（`<input type="date">`）、時刻は00:00〜23:30の30分刻みプルダウンに分離しています。内部的には従来の datetime-local 形式の文字列（`YYYY-MM-DDTHH:mm`）で状態を持つため、`src/lib/dateUtils.ts` の変換関数はそのまま使えます。
- **使用者名**（[`src/components/EmployeeCombobox.tsx`](src/components/EmployeeCombobox.tsx)）: テキスト入力で候補を絞り込める検索付きプルダウンです。候補一覧にない文字列のままフォーカスを外すと、直前に確定していた値に自動的に戻るため、「自由入力ではなくプルダウン選択」という要件は維持されます。

---

## 11. 多言語対応（日本語 / ベトナム語）の仕組み

### 画面の文言（UI翻訳）

`next-intl` のような URL ルーティング型の i18n ライブラリは使わず、Cookie ベースの軽量な自前実装にしています。

- ヘッダー右上の切替ボタン（[`src/components/LanguageSwitcher.tsx`](src/components/LanguageSwitcher.tsx)）を押すと `locale` Cookie を書き換え、ページを再取得します
- 画面の文言はすべて [`src/lib/i18n/dictionaries/ja.ts`](src/lib/i18n/dictionaries/ja.ts) と [`vi.ts`](src/lib/i18n/dictionaries/vi.ts) の対訳オブジェクトにまとまっています（バリデーションメッセージやAPIのエラー文言も含む）
- サーバーコンポーネント・APIルートは `getLocale()`（Cookieを読む）→`getDictionary()` を直接呼び出し、クライアントコンポーネントは `LocaleProvider` が配る React Context（`useI18n()`）から辞書を受け取ります
- 曜日表記や日付の並び順は `Intl.DateTimeFormat` のロケールタグ（`ja-JP`/`vi-VN`）を切り替えるだけで自動的に対応しています（[`src/lib/dateUtils.ts`](src/lib/dateUtils.ts)）
- 文言を修正・追加したい場合は、上記2つの辞書ファイルを直接編集してください（TypeScriptの型でキー構造の一致がチェックされます）

### 行き先・用途の自動翻訳

社員が自由入力する「行き先」「用途」は、あらかじめ対訳を用意しておけないため、無料の翻訳API（[MyMemory Translation API](https://mymemory.translated.net/)、登録・APIキー不要）を使って自動翻訳しています（[`src/lib/translate.ts`](src/lib/translate.ts)）。

- 予約の登録・変更時（内容が変わった場合のみ）に、入力文字列にひらがな・カタカナ・漢字が含まれるかで日本語/ベトナム語を判定し、もう一方の言語に翻訳してDBに保存します（`input_locale` / `destination_translated` / `purpose_translated`）
- 表示時は、閲覧中の言語が入力言語と同じならそのまま、異なれば翻訳キャッシュを表示し「(自動翻訳)」と注記します
- 翻訳APIが失敗・タイムアウト（5秒）した場合は、予約の登録自体は止めずに翻訳なし（元の文言のまま表示）にフォールバックします

> **品質について**: MyMemoryは無料・登録不要な分、短い文の翻訳が不自然になることがあります（実際の検証でも「Đón khách hàng」→「- 客か？」のような誤訳が確認されています）。より高品質・安定した翻訳が必要な場合は、`translateText()` 内のAPI呼び出し部分を Google Cloud Translation API や DeepL API に差し替えてください（要アカウント作成・APIキー発行）。
