-- ============================================================
-- 社用車予約システム データベーススキーマ
-- Supabase の SQL Editor にこのファイルの内容を貼り付けて実行してください。
-- ============================================================

-- 予約の時間範囲重複を DB レベルで防ぐために使用します
create extension if not exists btree_gist;

-- ------------------------------------------------------------
-- employees: 社員名マスタ
-- ------------------------------------------------------------
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table employees is '社員名マスタ。予約時のプルダウンに使用。is_active=false で選択肢から除外（履歴は残す）';

-- 後から追加されたカラム。schema.sql を既存データベースに再実行しても
-- 冪等に反映されるよう、create table とは別に ALTER TABLE で追加する。
alter table employees add column if not exists department text;
alter table employees add column if not exists age integer;

comment on column employees.department is '所属部署（任意）';
comment on column employees.age is '年齢（任意、15〜100の範囲はAPI側でチェック）';

-- ------------------------------------------------------------
-- reservations: 社用車予約
-- ------------------------------------------------------------
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  destination text not null,
  purpose text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint end_after_start check (end_time > start_time),

  -- アプリ側の重複チェックに加え、DB レベルでも同時刻の重複予約を拒否する。
  -- tstzrange(start_time, end_time, '[)') は「開始を含み終了を含まない」区間なので、
  -- 9:00-11:00 と 11:00-12:00 は重複と判定されない（要件どおり）。
  constraint no_overlapping_reservations exclude using gist (
    tstzrange(start_time, end_time, '[)') with &&
  )
);

comment on table reservations is '社用車（1台）の予約。no_overlapping_reservations 制約により同時刻の重複予約は DB レベルで拒否される。';

-- 行き先・用途の多言語表示用。入力言語（ja/vi）と、もう一方の言語への
-- 機械翻訳結果をキャッシュしておく（毎回翻訳APIを呼ばずに済ませるため）。
-- 翻訳に失敗した場合は *_translated が null のままになり、表示側は
-- 元の文言（destination/purpose）にフォールバックする。
alter table reservations add column if not exists input_locale text not null default 'ja';
alter table reservations add column if not exists destination_translated text;
alter table reservations add column if not exists purpose_translated text;

comment on column reservations.input_locale is '行き先・用途が入力された言語（ja または vi）。サーバー側で自動判定して設定する。';
comment on column reservations.destination_translated is '行き先の機械翻訳キャッシュ（input_localeとは逆の言語）。翻訳失敗時はnull。';
comment on column reservations.purpose_translated is '用途の機械翻訳キャッシュ（input_localeとは逆の言語）。翻訳失敗時はnull。';

-- updated_at を自動更新するトリガー
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reservations_updated_at on reservations;
create trigger trg_reservations_updated_at
before update on reservations
for each row execute function set_updated_at();

-- 検索を高速化するインデックス
create index if not exists idx_reservations_start_time on reservations (start_time);

-- ------------------------------------------------------------
-- reservation_logs: 予約の登録・変更・削除の操作履歴
-- ------------------------------------------------------------
create table if not exists reservation_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('create', 'update', 'delete')),
  employee_name text not null,
  reservation_start_time timestamptz,
  reservation_end_time timestamptz,
  reservation_destination text,
  created_at timestamptz not null default now()
);

comment on table reservation_logs is '予約の登録・変更・削除の操作履歴。対象の予約が後で削除されても履歴は残るよう、reservation テーブルへの外部キーは持たせず、実行時点の内容をスナップショットとして保持する。';

create index if not exists idx_reservation_logs_created_at on reservation_logs (created_at desc);

-- ============================================================
-- フェーズ1: 認証・権限（Supabase Auth）
-- ロールバック方法:
--   drop trigger if exists trg_auth_user_created on auth.users;
--   drop function if exists handle_new_auth_user();
--   drop function if exists current_user_role();
--   drop function if exists current_user_active();
--   drop table if exists users;
-- 事前確認: このブロックを本番へ適用する前に、Supabaseダッシュボードの
-- Authentication > Providers > Email で「Enable email signups（自己サインアップ）」
-- を無効化してください。ユーザー追加は system_admin による招待のみを想定しています
-- （README・OPERATIONS.md 参照）。
-- ============================================================

-- ------------------------------------------------------------
-- users: 認証済み社員のプロフィール・権限（auth.users と1:1で連携）
-- ------------------------------------------------------------
create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'employee' check (role in ('employee', 'vehicle_manager', 'system_admin')),
  department text,
  locale text not null default 'ja',
  active boolean not null default true,
  driver_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table users is '認証済み社員のプロフィール・権限。auth.users と1:1（招待受諾・初回サインイン時にトリガーで自動作成）。共有パスワード方式は廃止し、個人アカウント単位で権限を持つ。';
comment on column users.role is 'employee: 自分の予約のみ操作可 / vehicle_manager: 全予約・車両管理 / system_admin: ユーザー管理含む全権限';
comment on column users.driver_eligible is 'trueの社員のみ予約可能。免許証番号や画像などの機密情報はここに保存しない（有効期限管理が必要な場合も期限のみを別途保存する設計を推奨）。';

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row execute function set_updated_at();

-- auth.users に新規行ができたタイミング（招待受諾・初回サインイン）で
-- public.users にプロフィール行を自動作成する。役割は必ず 'employee' から開始し、
-- 権限昇格は既存の system_admin が管理画面（またはSQL）から手動で行う。
create or replace function handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'employee'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
after insert on auth.users
for each row execute function handle_new_auth_user();

-- RLSポリシー内で users テーブルを安全に参照するためのヘルパー関数。
-- security definer で実行することで、ポリシー同士の再帰評価を避ける
-- （Supabase公式に推奨されるパターン）。
create or replace function current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function current_user_active()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select active from public.users where id = auth.uid()), false);
$$;

alter table users enable row level security;

-- 自分の行、または vehicle_manager/system_admin は全員の行を閲覧できる
-- （lib/auth.ts の getCurrentUser() は anon key + セッションで直接このテーブルを
-- 読むため、実際にアプリの動作を左右する数少ないRLSポリシーの一つ）。
drop policy if exists users_select_own_or_manager on users;
create policy users_select_own_or_manager on users for select
  using (auth.uid() = id or current_user_role() in ('vehicle_manager', 'system_admin'));

-- 更新は system_admin のみ（役割変更・無効化など）。それ以外の書き込みは
-- サーバー側（service role）の API ルートを経由し、ここでは許可しない。
drop policy if exists users_update_admin_only on users;
create policy users_update_admin_only on users for update
  using (current_user_role() = 'system_admin')
  with check (current_user_role() = 'system_admin');

-- ------------------------------------------------------------
-- Row Level Security（既存テーブル）
-- このアプリはブラウザから直接 Supabase を呼ばず、必ず Next.js の
-- API ルート（サーバー側・service role key）を経由します。
-- そのため RLS は有効化した上でポリシーを一切作成せず、
-- anon / authenticated からの直接アクセスを完全にブロックします
-- （service role はRLSを常にバイパスします）。
-- ------------------------------------------------------------
alter table employees enable row level security;
alter table reservations enable row level security;
alter table reservation_logs enable row level security;

-- ------------------------------------------------------------
-- 初期データ：仮の社員名10名
-- 社員名は employees テーブルの行なので、後から管理画面
-- （または SQL）で自由に追加・無効化できます。
-- ------------------------------------------------------------
insert into employees (name)
select v.name
from (values
  ('社員A'), ('社員B'), ('社員C'), ('社員D'), ('社員E'),
  ('社員F'), ('社員G'), ('社員H'), ('社員I'), ('社員J')
) as v(name)
where not exists (select 1 from employees);

-- ============================================================
-- フェーズ2: 車両・予約状態・監査ログ・設定
-- ロールバック方法（依存関係の都合上、この順で実行）:
--   drop table if exists recurring_reservation_rules;
--   drop table if exists waitlist_entries;
--   drop table if exists favorite_destinations;
--   drop table if exists notification_deliveries;
--   drop table if exists notifications;
--   drop table if exists app_settings;
--   drop table if exists audit_logs;
--   drop table if exists maintenance_blocks;
--   drop table if exists vehicle_usage_records;
--   alter table reservations drop constraint if exists no_overlapping_reservations;
--   alter table reservations
--     drop column if exists vehicle_id,
--     drop column if exists owner_user_id,
--     drop column if exists created_by_user_id,
--     drop column if exists updated_by_user_id,
--     drop column if exists status,
--     drop column if exists cancellation_reason,
--     drop column if exists cancelled_at,
--     drop column if exists cancelled_by_user_id;
--   drop table if exists vehicles;
-- 事前確認（本番へ適用する前に必ず実行し、結果を確認すること）:
--   1. 既存データのバックアップを取得する（Supabaseダッシュボード > Database > Backups）。
--   2. 以下で既存予約に不整合がないか確認する:
--      select count(*) from reservations where end_time <= start_time;
--   3. 本ブロックはトランザクション内で実行し、異常があればロールバックできるようにする。
-- ============================================================

-- ------------------------------------------------------------
-- vehicles: 車両マスタ（将来の複数台対応を見据え、reservations は必ず vehicle_id を持つ）
-- ------------------------------------------------------------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plate_number text,
  model text,
  parking_location text,
  key_location text,
  etc_card_location text,
  fuel_card_location text,
  emergency_contact text,
  insurance_contact text,
  roadside_assistance_contact text,
  notes text,
  status text not null default 'available' check (status in ('available', 'in_use', 'maintenance', 'out_of_service')),
  active boolean not null default true,
  inspection_due_date date,
  insurance_due_date date,
  next_service_due_date date,
  oil_change_due_date date,
  tire_change_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table vehicles is '車両マスタ。現在は1台運用だが、将来2台目以降を追加する際もこのテーブルに行を足すだけでよい設計。';
comment on column vehicles.status is 'available: 利用可能 / in_use: 使用中 / maintenance: 整備中 / out_of_service: 利用停止中';
comment on column vehicles.parking_location is '駐車位置。key_location/etc_card_location/fuel_card_location とともに一般社員にも表示してよい情報（アプリ側で判定）。';
comment on column vehicles.insurance_contact is '保険会社の連絡先。emergency_contact（緊急連絡先）とあわせて管理者限定表示を想定（アプリ側で判定）。';

drop trigger if exists trg_vehicles_updated_at on vehicles;
create trigger trg_vehicles_updated_at
before update on vehicles
for each row execute function set_updated_at();

-- 既存運用のための最初の1台を作成する（名前は後から管理画面で変更可能）。
insert into vehicles (name)
select '社用車'
where not exists (select 1 from vehicles);

-- ------------------------------------------------------------
-- reservations: 車両・所有者・状態列を追加（既存データは一切削除しない）
-- ------------------------------------------------------------
alter table reservations add column if not exists vehicle_id uuid references vehicles (id);
alter table reservations add column if not exists owner_user_id uuid references users (id);
alter table reservations add column if not exists created_by_user_id uuid references users (id);
alter table reservations add column if not exists updated_by_user_id uuid references users (id);
alter table reservations add column if not exists status text not null default 'reserved'
  check (status in ('reserved', 'in_use', 'completed', 'cancelled', 'no_show', 'overdue'));
alter table reservations add column if not exists cancellation_reason text;
alter table reservations add column if not exists cancelled_at timestamptz;
alter table reservations add column if not exists cancelled_by_user_id uuid references users (id);

comment on column reservations.employee_name is '【移行前レガシー】文字列のみの使用者名。owner_user_id が null の既存予約はこの列を表示に使い、管理者が後から owner_user_id を割り当てられる。';
comment on column reservations.vehicle_id is '対象車両。既存予約には最初の1台のIDを一括で割り当てている（下記UPDATE参照）。';
comment on column reservations.owner_user_id is '予約の所有者（users.id）。既存データは自動紐付けができないため null のまま保持し、管理者が手動で割り当てる（未割当予約として扱う）。';
comment on column reservations.status is 'reserved: 予約済み / in_use: 使用中 / completed: 利用完了 / cancelled: キャンセル済み / no_show: 未使用 / overdue: 返却遅延';

-- 既存予約すべてに最初の1台の vehicle_id を割り当てる（未割当のみ対象、再実行しても安全）。
update reservations
set vehicle_id = (select id from vehicles order by created_at asc limit 1)
where vehicle_id is null;

-- ここまでで全既存行に vehicle_id が入っていることを確認してから NOT NULL 化する。
do $$
begin
  if not exists (select 1 from reservations where vehicle_id is null) then
    alter table reservations alter column vehicle_id set not null;
  end if;
end $$;

-- 重複防止制約を車両単位に更新する（同じ車両・重なる時間帯のみを排他対象とし、
-- キャンセル済み/完了/無断キャンセル済みの予約は対象から除外する＝物理削除しなくても
-- 新規予約のブロッカーにならない）。
alter table reservations drop constraint if exists no_overlapping_reservations;
alter table reservations add constraint no_overlapping_reservations
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status in ('reserved', 'in_use', 'overdue'));

create index if not exists idx_reservations_vehicle_id on reservations (vehicle_id);
create index if not exists idx_reservations_owner_user_id on reservations (owner_user_id);
create index if not exists idx_reservations_status on reservations (status);

-- ------------------------------------------------------------
-- vehicle_usage_records: 出発・返却時の実車記録
-- ------------------------------------------------------------
create table if not exists vehicle_usage_records (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations (id),
  vehicle_id uuid not null references vehicles (id),
  user_id uuid references users (id),
  checked_out_at timestamptz,
  returned_at timestamptz,
  departure_odometer integer,
  return_odometer integer,
  fuel_level_at_departure smallint check (fuel_level_at_departure between 0 and 100),
  fuel_level_at_return smallint check (fuel_level_at_return between 0 and 100),
  refueled boolean not null default false,
  issue_reported boolean not null default false,
  issue_description text,
  interior_condition text,
  damage_reported boolean not null default false,
  damage_description text,
  photo_paths text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table vehicle_usage_records is '出発・返却時に記録する実車の状態。通常利用時は主要項目のみ、異常時に詳細項目を入力する想定（UI側で「異常あり」の場合だけ展開）。';
comment on column vehicle_usage_records.photo_paths is 'Supabase Storageの非公開バケット内のパス（認証済みユーザーのみ閲覧可）。公開URLは発行しない。';

drop trigger if exists trg_vehicle_usage_records_updated_at on vehicle_usage_records;
create trigger trg_vehicle_usage_records_updated_at
before update on vehicle_usage_records
for each row execute function set_updated_at();

create index if not exists idx_vehicle_usage_records_reservation_id on vehicle_usage_records (reservation_id);

-- ------------------------------------------------------------
-- maintenance_blocks: 整備・利用停止期間（予約と同様に重複判定へ含める）
-- ------------------------------------------------------------
create table if not exists maintenance_blocks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  type text not null check (type in ('inspection', 'service', 'repair', 'tire_change', 'cleaning', 'other')),
  reason text,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by_user_id uuid references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint maintenance_end_after_start check (end_at > start_at)
);

comment on table maintenance_blocks is '整備・車検・清掃などによる利用停止期間。予約作成時のアプリ側チェックでこのテーブルとの重複も確認する（DBの排他制約は表をまたげないため、アプリ側の重複チェック関数で reservations と maintenance_blocks の両方を見る）。';

drop trigger if exists trg_maintenance_blocks_updated_at on maintenance_blocks;
create trigger trg_maintenance_blocks_updated_at
before update on maintenance_blocks
for each row execute function set_updated_at();

-- 整備期間同士の重複は防止する（同一車両・scheduled/in_progressのみ対象）。
alter table maintenance_blocks drop constraint if exists no_overlapping_maintenance;
alter table maintenance_blocks add constraint no_overlapping_maintenance
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status in ('scheduled', 'in_progress'));

create index if not exists idx_maintenance_blocks_vehicle_id on maintenance_blocks (vehicle_id);

-- ------------------------------------------------------------
-- audit_logs: 監査ログ（一般社員は閲覧・変更・削除不可、追記のみ）
-- ------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users (id),
  actor_email text,
  action text not null,
  target_type text,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

comment on table audit_logs is '監査ログ。誰が・いつ・何を・なぜ変更したかを記録する。書き込みはサーバー側（service role）経由のみとし、一般社員はもちろんvehicle_managerも変更・削除できない（system_admin/vehicle_managerは閲覧のみ可）。秘密情報やトークンは記録しない。';

create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_logs_target on audit_logs (target_type, target_id);

-- ------------------------------------------------------------
-- app_settings: 運用設定（1行のみ存在するシングルトンテーブル）
-- ------------------------------------------------------------
create table if not exists app_settings (
  id boolean primary key default true check (id),
  booking_horizon_days integer not null default 90,
  normal_max_duration_minutes integer not null default 240,
  manager_max_duration_minutes integer not null default 480,
  minimum_duration_minutes integer not null default 30,
  time_slot_minutes integer not null default 30,
  max_concurrent_reservations_per_user integer not null default 3,
  reminder_day_before_enabled boolean not null default true,
  reminder_before_start_minutes integer not null default 30,
  updated_by_user_id uuid references users (id),
  updated_at timestamptz not null default now()
);

comment on table app_settings is 'アプリ全体の運用設定（1行のみ）。最大利用時間や予約可能期間などをコードに固定せず、system_adminが変更できるようにするための設定テーブル。';

insert into app_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists trg_app_settings_updated_at on app_settings;
create trigger trg_app_settings_updated_at
before update on app_settings
for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 将来機能向けスキーマ（フェーズ13）: 通知・お気に入り・キャンセル待ち・繰り返し予約
-- 現時点ではテーブル定義のみで、対応するUI/APIは未実装または最小限。
-- 詳細は IMPLEMENTATION_STATUS.md を参照。
-- ------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  target_user_id uuid references users (id),
  target_type text,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

comment on table notifications is '通知イベントのoutbox。実際の送信は notification_deliveries が担当し、送信プロバイダーはインターフェース化されている（src/lib/notifications/参照）。';

create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references notifications (id) on delete cascade,
  channel text not null check (channel in ('email', 'slack', 'teams', 'line_works', 'log')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_deliveries_status on notification_deliveries (status);

create table if not exists favorite_destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id),
  destination text not null,
  purpose text,
  created_at timestamptz not null default now()
);

comment on table favorite_destinations is 'user_id が null の行は「管理者が登録した共通候補」を表す。';

create table if not exists waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles (id),
  user_id uuid references users (id),
  desired_start_at timestamptz not null,
  desired_end_at timestamptz not null,
  status text not null default 'waiting' check (status in ('waiting', 'notified', 'confirmed', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recurring_reservation_rules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users (id),
  vehicle_id uuid references vehicles (id),
  frequency text not null check (frequency in ('weekly', 'monthly')),
  interval_count integer not null default 1,
  start_date date not null,
  end_date date,
  start_time time not null,
  end_time time not null,
  destination text,
  purpose text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS（フェーズ2で追加したテーブル）
-- vehicles / maintenance_blocks / app_settings は「閲覧は全ログインユーザー、
-- 書き込みは vehicle_manager 以上（app_settingsの更新のみ system_admin）」。
-- vehicle_usage_records は本人または管理者のみ閲覧・作成可。
-- audit_logs は vehicle_manager 以上が閲覧のみ可（書き込みポリシーなし＝service role経由のみ）。
-- notifications 系・お気に入り・キャンセル待ち・繰り返し予約は現時点でUIが
-- service role 経由のみのため、既存テーブルと同様ポリシーなし（anon/authenticatedから完全遮断）。
-- ------------------------------------------------------------
alter table vehicles enable row level security;
drop policy if exists vehicles_select_all on vehicles;
create policy vehicles_select_all on vehicles for select
  using (current_user_active());
drop policy if exists vehicles_write_managers on vehicles;
create policy vehicles_write_managers on vehicles for all
  using (current_user_role() in ('vehicle_manager', 'system_admin'))
  with check (current_user_role() in ('vehicle_manager', 'system_admin'));

alter table maintenance_blocks enable row level security;
drop policy if exists maintenance_blocks_select_all on maintenance_blocks;
create policy maintenance_blocks_select_all on maintenance_blocks for select
  using (current_user_active());
drop policy if exists maintenance_blocks_write_managers on maintenance_blocks;
create policy maintenance_blocks_write_managers on maintenance_blocks for all
  using (current_user_role() in ('vehicle_manager', 'system_admin'))
  with check (current_user_role() in ('vehicle_manager', 'system_admin'));

alter table vehicle_usage_records enable row level security;
drop policy if exists vehicle_usage_records_select_own_or_manager on vehicle_usage_records;
create policy vehicle_usage_records_select_own_or_manager on vehicle_usage_records for select
  using (user_id = auth.uid() or current_user_role() in ('vehicle_manager', 'system_admin'));
drop policy if exists vehicle_usage_records_write_own_or_manager on vehicle_usage_records;
create policy vehicle_usage_records_write_own_or_manager on vehicle_usage_records for all
  using (user_id = auth.uid() or current_user_role() in ('vehicle_manager', 'system_admin'))
  with check (user_id = auth.uid() or current_user_role() in ('vehicle_manager', 'system_admin'));

alter table audit_logs enable row level security;
drop policy if exists audit_logs_select_managers on audit_logs;
create policy audit_logs_select_managers on audit_logs for select
  using (current_user_role() in ('vehicle_manager', 'system_admin'));

alter table app_settings enable row level security;
drop policy if exists app_settings_select_all on app_settings;
create policy app_settings_select_all on app_settings for select
  using (current_user_active());
drop policy if exists app_settings_update_admin_only on app_settings;
create policy app_settings_update_admin_only on app_settings for update
  using (current_user_role() = 'system_admin')
  with check (current_user_role() = 'system_admin');

alter table notifications enable row level security;
alter table notification_deliveries enable row level security;
alter table favorite_destinations enable row level security;
alter table waitlist_entries enable row level security;
alter table recurring_reservation_rules enable row level security;

-- ============================================================
-- フェーズ3: 予約重複の完全防止（アトミックな作成・変更 + 二重送信防止）
-- ロールバック方法:
--   drop function if exists create_reservation_tx;
--   drop function if exists update_reservation_tx;
--   alter table reservations drop column if exists idempotency_key;
-- ============================================================

-- 送信ボタン連打・通信の再送・ブラウザの再読み込みで同じ予約が二重登録される
-- のを防ぐための冪等キー。クライアントが予約フォームを開いた時点で1回だけ
-- 生成し、送信のたびに同じ値を送る（unique制約により2回目以降は同じ行を返す）。
-- unique制約はnullを複数許可するため、キーを指定しない呼び出し（管理者の代理登録など）も
-- 問題なく動作する。
alter table reservations add column if not exists idempotency_key text;
create unique index if not exists idx_reservations_idempotency_key
  on reservations (idempotency_key)
  where (idempotency_key is not null);

-- 予約の新規作成をアトミックに行うRPC。
--   1. 対象車両のアドバイザリーロックを取得し、同一車両への同時作成を直列化する
--      （maintenance_blocks との重複チェックはDBの排他制約でカバーできないため、
--      このロックがなければ極めて狭い時間差でのすり抜けが起こり得る）。
--   2. 冪等キーが既に存在する場合は、新規作成せずその予約をそのまま返す
--      （二重送信対策。SQLSTATE '23505' の unique_violation を自前でハンドルする代わりに
--      事前チェックする方式）。
--   3. 整備・利用停止期間との重複を確認する。
--   4. INSERT する（予約同士の重複は no_overlapping_reservations 制約が最終的に保証する）。
create or replace function create_reservation_tx(
  p_vehicle_id uuid,
  p_owner_user_id uuid,
  p_created_by_user_id uuid,
  p_employee_name text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_destination text,
  p_purpose text,
  p_note text,
  p_input_locale text,
  p_destination_translated text,
  p_purpose_translated text,
  p_idempotency_key text default null
)
returns reservations
language plpgsql
as $$
declare
  v_reservation reservations;
  v_existing reservations;
  v_conflict_count integer;
begin
  if p_idempotency_key is not null then
    select * into v_existing from reservations where idempotency_key = p_idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_vehicle_id::text));

  select count(*) into v_conflict_count
  from maintenance_blocks
  where vehicle_id = p_vehicle_id
    and status in ('scheduled', 'in_progress')
    and start_at < p_end_time
    and end_at > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'maintenance_conflict'
      using errcode = 'P0001', detail = '整備・利用停止期間と重複しています。';
  end if;

  insert into reservations (
    vehicle_id, owner_user_id, created_by_user_id, updated_by_user_id,
    employee_name, start_time, end_time, destination, purpose, note,
    input_locale, destination_translated, purpose_translated, status, idempotency_key
  ) values (
    p_vehicle_id, p_owner_user_id, p_created_by_user_id, p_created_by_user_id,
    p_employee_name, p_start_time, p_end_time, p_destination, p_purpose, p_note,
    p_input_locale, p_destination_translated, p_purpose_translated, 'reserved', p_idempotency_key
  )
  returning * into v_reservation;

  return v_reservation;
end;
$$;

-- 予約の変更をアトミックに行うRPC（延長・時間変更も含む）。
-- 対象自身（p_reservation_id）は重複判定・整備判定から除外する。
create or replace function update_reservation_tx(
  p_reservation_id uuid,
  p_vehicle_id uuid,
  p_updated_by_user_id uuid,
  p_employee_name text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_destination text,
  p_purpose text,
  p_note text,
  p_input_locale text,
  p_destination_translated text,
  p_purpose_translated text
)
returns reservations
language plpgsql
as $$
declare
  v_reservation reservations;
  v_conflict_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_vehicle_id::text));

  select count(*) into v_conflict_count
  from maintenance_blocks
  where vehicle_id = p_vehicle_id
    and status in ('scheduled', 'in_progress')
    and start_at < p_end_time
    and end_at > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'maintenance_conflict'
      using errcode = 'P0001', detail = '整備・利用停止期間と重複しています。';
  end if;

  update reservations
  set
    vehicle_id = p_vehicle_id,
    updated_by_user_id = p_updated_by_user_id,
    employee_name = p_employee_name,
    start_time = p_start_time,
    end_time = p_end_time,
    destination = p_destination,
    purpose = p_purpose,
    note = p_note,
    input_locale = p_input_locale,
    destination_translated = p_destination_translated,
    purpose_translated = p_purpose_translated
  where id = p_reservation_id
    and status = 'reserved'
  returning * into v_reservation;

  if not found then
    raise exception 'not_editable'
      using errcode = 'P0002', detail = '開始前の予約のみ変更できます。';
  end if;

  return v_reservation;
end;
$$;
