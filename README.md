# 社用車予約Webアプリ

社用車1台を対象とした社内向け予約管理システムです。Next.js (App Router) + TypeScript + Supabase で構築しています。

## 主な機能

- 予約登録（使用者名は検索付きプルダウン、開始/終了日時はカレンダー＋30分刻みプルダウン、行き先、用途、備考）
- トップページは大きな月間カレンダー表示。該当日をタップするとその日付を入れた新規予約画面に進む
- カレンダーは「詳細な時間」（今日の予約のガントチャート）表示と切替可能。今日の予約リストは常に表示
- 予約時間ルールの検証（30分単位、最短30分〜最大4時間、過去日時不可、終了>開始）
- 予約重複チェック（アプリ側 + DB側の二重チェック）
- 今日の予約 / 今週の予約（日付ごと） / 全予約一覧の表示
- 予約変更（全社員が利用可）
- 予約削除（予約した本人、または管理者のみ。管理者は簡易パスワード認証）
- 予約の登録・変更・削除の操作履歴を記録（日時・動作・名前。管理者ページで閲覧可能）
- 社員名リストの管理（追加・名前/所属部署/年齢の編集・無効化、管理者のみ）
- 日本語 / ベトナム語の言語切替（ヘッダー右上、Cookieで記憶）
- 行き先・用途は入力言語と表示言語が異なる場合、自動翻訳された文言を表示
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

# 4. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開くと確認できます。スマホ実機で確認したい場合は、`npm run dev -- -H 0.0.0.0` などでLAN内からアクセスしてください。

---

## 2. Supabaseで作成するテーブル定義

Supabase プロジェクトの **SQL Editor** で [`supabase/schema.sql`](supabase/schema.sql) の内容をそのまま実行してください。以下がその概要です。

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

このアプリはブラウザから直接 Supabase を呼び出さず、**必ず Next.js の API ルート（サーバー側・service role key）を経由**します。そのため全テーブル（`reservations` / `employees` / `reservation_logs`）とも RLS を有効化した上でポリシーを一切作成せず、anon キーによる直接アクセスを完全にブロックしています。

---

## 3. 環境変数の設定方法

`.env.local`（ローカル）または Vercel の Environment Variables（本番）に以下を設定してください。

| 変数名 | 説明 | 取得方法 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Supabase ダッシュボード → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の service role key（**秘密情報**） | 同上（`service_role` の値。絶対にクライアントに公開しないこと） |
| `ADMIN_PASSWORD` | 管理者ログイン用パスワード | 任意の文字列を設定 |
| `ADMIN_SESSION_SECRET` | 管理者セッションの署名用シークレット（32文字以上推奨） | `openssl rand -hex 32` などで生成 |

`.env.local.example` をコピーして使うと簡単です。

> **注意**: `SUPABASE_SERVICE_ROLE_KEY` は全テーブルへのフルアクセス権を持つ強力なキーです。`NEXT_PUBLIC_` を付けていないため、ブラウザには一切送信されず、サーバーサイド（API ルート）でのみ使用されます。Gitにコミットしないでください（`.gitignore` で `.env*.local` は除外済みです）。

---

## 4. Vercelに公開するための手順

1. このプロジェクトを GitHub 等のリポジトリにプッシュする
2. [Vercel](https://vercel.com/) でリポジトリを Import する
3. Vercel の **Project Settings → Environment Variables** に、上記「環境変数」の4つを設定する
4. Deploy を実行する
5. デプロイ完了後、発行された URL にアクセスして動作確認する

Vercel はプルリクエストごとにプレビュー環境を作成できます。環境変数はプレビュー用と本番用で同じ Supabase プロジェクトを共用しても問題ありません（社内ツールのため）。

---

## 5. 主要なファイル構成

```
src/
  app/
    page.tsx                       トップページ（カレンダー/詳細な時間切替、今日/今週の予約）
    layout.tsx                     全体レイアウト・ヘッダー
    globals.css                    Tailwind の読み込み・共通スタイル
    reservations/
      page.tsx                     全予約一覧（日付ごとにグループ表示）
      new/page.tsx                 新規予約フォーム
      [id]/edit/page.tsx           予約変更フォーム
    admin/
      page.tsx                     管理者ページ（未ログイン時はログインフォーム）
    api/
      reservations/route.ts        GET(一覧・期間指定) / POST(新規登録)
      reservations/[id]/route.ts   GET(単体) / PUT(変更) / DELETE(削除・本人 or 管理者)
      employees/route.ts           GET(社員一覧) / POST(社員追加・管理者のみ)
      employees/[id]/route.ts      PATCH(社員名変更・有効/無効切替・管理者のみ)
      admin/login/route.ts         管理者ログイン（パスワード照合・Cookie発行）
      admin/logout/route.ts        管理者ログアウト
      admin/session/route.ts       ログイン状態確認用
  components/
    ReservationForm.tsx            予約登録・変更フォーム（新規/編集で共用、カレンダーからの日付引き継ぎに対応）
    DateTimeSelect.tsx             日付(カレンダー)＋時刻(30分刻みプルダウン)の入力
    EmployeeCombobox.tsx           使用者名の検索付きプルダウン（自由入力は確定させない）
    ReservationCard.tsx            予約1件分の表示カード
    SelfDeleteButton.tsx           一般社員向け削除ボタン（本人確認付き）
    TodayView.tsx                  今日の予約リスト（常時表示）
    TopScheduleToggle.tsx          トップページの「カレンダー」⇔「詳細な時間」切替
    MonthCalendar.tsx              月間カレンダー（該当日タップで新規予約へ、予約有無をドット表示）
    TodayGanttChart.tsx            今日の予約のガントチャート（「詳細な時間」表示）
    WeekReservations.tsx           今週の予約を日付ごとに表示
    AdminReservationList.tsx       管理者向け予約一覧＋削除ボタン
    AdminOperationHistory.tsx      管理者向け操作履歴（予約・変更・削除）テーブル
    EmployeeManager.tsx            社員名リストの追加・無効化UI
    AdminLoginForm.tsx / AdminLogoutButton.tsx
    Header.tsx                     共通ヘッダー
  lib/
    types.ts                       型定義（Reservation, Employee, ReservationLog など）
    reservationRules.ts            予約時間ルールの検証ロジック（★重複チェック以外の全ルール）
    overlapCheck.ts                予約重複チェックのロジック（★本体）
    reservationLogs.ts             予約の操作履歴（予約・変更・削除）を記録するヘルパー
    supabaseAdmin.ts                Supabase サーバークライアント（service role）
    requireAdmin.ts / adminAuth.ts  管理者セッションの発行・検証
    data.ts                        サーバーコンポーネント用のデータ取得関数
    mappers.ts                     DB(snake_case) ⇔ アプリ内(camelCase) の変換
    dateUtils.ts                   日時フォーマット・今日/今週/月間の範囲計算（Asia/Tokyo固定）
supabase/
  schema.sql                       テーブル定義（Supabase SQL Editorで実行）
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

## 9. 予約削除の権限について

このアプリには本格的な社員ログイン機能がないため、削除できる人を厳密な認証で判定することはできません。そのため、以下の運用レベルの権限モデルを採用しています。

- **予約した本人**: 管理者ログインなしで、自分の予約に限り削除できます。予約カードの「削除」を押すと「あなたの名前を選択」という自己申告フォームが開き、選んだ名前がその予約の使用者名と一致する場合のみ削除が実行されます（[`src/components/SelfDeleteButton.tsx`](src/components/SelfDeleteButton.tsx)）。
- **管理者**: 管理者パスワードでログインしていれば、誰の予約でも削除できます（[`/admin`](src/app/admin/page.tsx) ページ、または一般ページの削除ボタンからも管理者セッションがあれば無条件で削除可能）。
- **他人の予約**: 一般社員が他人の名前を選んで削除しようとした場合は、`DELETE /api/reservations/[id]` がサーバー側で `employee_name` と突き合わせて `403` を返し拒否します（[`src/app/api/reservations/[id]/route.ts`](<src/app/api/reservations/[id]/route.ts>)）。

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
