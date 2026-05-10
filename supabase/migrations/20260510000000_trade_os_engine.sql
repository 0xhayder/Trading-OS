-- Trade Insight Engine — institutional schema (PostgreSQL / Supabase)
-- Run after core `trades` / `watchlist` / `settings` tables exist, or create `trades` first via Drizzle.

-- Optional profile row per Supabase auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_os_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  base_account_equity real not null default 10000,
  max_single_position_pct real not null default 25,
  factor_config jsonb,
  updated_at timestamptz not null default now()
);

alter table public.trades
  add column if not exists user_id uuid references public.profiles (id) on delete set null,
  add column if not exists trade_classification text,
  add column if not exists engine_version text,
  add column if not exists score_breakdown jsonb,
  add column if not exists psychology_notes text,
  add column if not exists market_context jsonb,
  add column if not exists was_rejected_by_engine boolean default false,
  add column if not exists is_hypothetical boolean default false,
  add column if not exists hypothetical_pnl_pct real;

create table if not exists public.trade_factors (
  id bigserial primary key,
  trade_id integer not null references public.trades (id) on delete cascade,
  layer text not null,
  factor_key text not null,
  weight_in_layer real not null,
  raw_score real not null,
  weighted_contribution real not null,
  input_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trade_factors_trade_id_idx on public.trade_factors (trade_id);

create table if not exists public.trade_results (
  id bigserial primary key,
  trade_id integer not null unique references public.trades (id) on delete cascade,
  outcome text,
  pnl_pct real,
  pnl_absolute real,
  hold_duration_hours real,
  equity_after real,
  max_favorable_excursion_pct real,
  max_adverse_excursion_pct real,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_screenshots (
  id bigserial primary key,
  trade_id integer not null references public.trades (id) on delete cascade,
  storage_path text not null,
  public_url text,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists trade_screenshots_trade_id_idx on public.trade_screenshots (trade_id);

create table if not exists public.analytics_snapshots (
  id bigserial primary key,
  user_id uuid references public.profiles (id) on delete set null,
  snapshot_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists analytics_snapshots_user_id_idx on public.analytics_snapshots (user_id);

alter table public.watchlist
  add column if not exists user_id uuid references public.profiles (id) on delete set null;

-- RLS: tighten per environment. Child tables inherit access patterns from your API (service role) or add scoped policies.
alter table public.profiles enable row level security;
alter table public.user_os_settings enable row level security;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

create policy "user_os_settings_self_all" on public.user_os_settings
  for all using (auth.uid() = user_id);
