-- Core tables for the TradeOS journal UI.
-- This migration must run before the engine extension migration.

create table if not exists public.trades (
  id serial primary key,
  coin text not null,
  setup_type text not null,
  timeframe text not null,
  btc_condition text not null default 'Neutral',
  alt_condition text not null default 'Neutral',
  narrative_strength text not null default 'Active',
  level_clarity text not null default 'Decent',
  timeframe_alignment text not null default 'Partially Aligned',
  retest_quality text not null default 'Acceptable',
  volume_strength text not null default 'Normal',
  candle_impulse text not null default 'Medium',
  follow_through text not null default 'Slowing',
  stop_loss_pct real not null default 0,
  tp1_pct real not null default 0,
  tp2_pct real not null default 0,
  entry_distance text not null default 'Acceptable',
  space_to_resistance text not null default 'Decent Space',
  rr_quality text not null default 'Acceptable',
  overextension text not null default 'Calm',
  event_risk text not null default 'Low',
  liquidity_risk text not null default 'Acceptable',
  notes text,
  mode text not null default 'trade',
  outcome text,
  actual_pnl_pct real,
  exit_price real,
  mistake_tags text,
  status text not null default 'open',
  final_score real not null,
  trade_status text not null,
  suggested_allocation_pct real not null,
  suggested_sl_pct real not null,
  suggested_tp_structure text not null,
  suggested_rr real not null,
  trade_warnings text not null default '',
  calculated_risk real not null default 0,
  expected_profit_pct real not null default 0,
  expected_loss_pct real not null default 0,
  final_decision text not null,
  created_at timestamptz not null default now()
);

create index if not exists trades_created_at_idx on public.trades (created_at desc);
create index if not exists trades_status_idx on public.trades (status);
create index if not exists trades_coin_idx on public.trades (coin);

create table if not exists public.watchlist (
  id serial primary key,
  coin text not null,
  setup_type text not null,
  timeframe text not null,
  btc_condition text not null,
  alt_condition text not null,
  narrative_strength text not null,
  level_clarity text not null,
  timeframe_alignment text not null,
  retest_quality text not null,
  volume_strength text not null,
  candle_impulse text not null,
  follow_through text not null,
  stop_loss_pct real not null,
  tp1_pct real not null,
  tp2_pct real not null,
  entry_distance text not null,
  space_to_resistance text not null,
  rr_quality text not null,
  overextension text not null,
  event_risk text not null,
  liquidity_risk text not null,
  notes text not null default '',
  outcome text,
  final_score real not null default 0,
  trade_status text not null default 'Watchlist',
  suggested_allocation_pct real not null default 0,
  suggested_sl_pct real not null default 0,
  suggested_tp_structure text not null default '',
  suggested_rr real not null default 0,
  trade_warnings text not null default '',
  final_decision text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists watchlist_created_at_idx on public.watchlist (created_at desc);
create index if not exists watchlist_coin_idx on public.watchlist (coin);

create table if not exists public.settings (
  id serial primary key,
  total_capital real not null default 10000,
  risk_profile_pct real not null default 1.5,
  default_risk_pct real not null default 1,
  max_allocation_pct real not null default 5
);

insert into public.settings (id, total_capital, risk_profile_pct, default_risk_pct, max_allocation_pct)
values (1, 10000, 1.5, 1, 5)
on conflict (id) do nothing;
