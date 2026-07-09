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
-- Row Level Security
-- このアプリはブラウザから直接 Supabase を呼ばず、必ず Next.js の
-- API ルート（サーバー側・service role key）を経由します。
-- そのため RLS は有効化した上でポリシーを一切作成せず、
-- anon / authenticated からの直接アクセスを完全にブロックします。
-- ------------------------------------------------------------
alter table employees enable row level security;
alter table reservations enable row level security;

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
