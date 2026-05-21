-- Structured TradeOS upgrade:
-- - New observable-input trade fields
-- - Read-only close workflow fields
-- - Standardized mistake tag analytics
-- - Capital adjustments separated from trading PnL analytics

alter table public.trades
  add column if not exists narrative_category text,
  add column if not exists market_cap_tier text,
  add column if not exists btc_higher_tf_structure text,
  add column if not exists btc_mid_tf_structure text,
  add column if not exists alt_market_higher_tf text,
  add column if not exists alt_market_mid_tf text,
  add column if not exists btc_volatility_state text,
  add column if not exists narrative_heat text,
  add column if not exists breakout_state text,
  add column if not exists reclaim_status text,
  add column if not exists htf_location text,
  add column if not exists lower_tf_entry_structure text,
  add column if not exists volume_state text,
  add column if not exists relative_volume text,
  add column if not exists post_breakout_behavior text,
  add column if not exists entry_price real,
  add column if not exists stop_loss_price real,
  add column if not exists tp1_price real,
  add column if not exists tp2_price real,
  add column if not exists tp3_price real,
  add column if not exists tp1_position_pct real,
  add column if not exists tp2_position_pct real,
  add column if not exists tp3_position_pct real,
  add column if not exists entry_location text,
  add column if not exists liquidity_stability text,
  add column if not exists move_sl_rule text,
  add column if not exists invalidation_type text,
  add column if not exists closed_at timestamptz,
  add column if not exists mistake_note text,
  add column if not exists close_notes text,
  add column if not exists management_notes text,
  add column if not exists execution_analysis text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trades'
      and column_name = 'mistake_tags'
      and data_type <> 'ARRAY'
  ) then
    alter table public.trades
      alter column mistake_tags type text[]
      using case
        when mistake_tags is null or trim(mistake_tags) = '' then null
        else regexp_split_to_array(mistake_tags, '\s*,\s*')
      end;
  end if;
end $$;

alter table public.watchlist
  add column if not exists narrative_category text,
  add column if not exists market_cap_tier text,
  add column if not exists btc_higher_tf_structure text,
  add column if not exists btc_mid_tf_structure text,
  add column if not exists alt_market_higher_tf text,
  add column if not exists alt_market_mid_tf text,
  add column if not exists btc_volatility_state text,
  add column if not exists narrative_heat text,
  add column if not exists breakout_state text,
  add column if not exists reclaim_status text,
  add column if not exists htf_location text,
  add column if not exists lower_tf_entry_structure text,
  add column if not exists volume_state text,
  add column if not exists relative_volume text,
  add column if not exists post_breakout_behavior text,
  add column if not exists entry_price real,
  add column if not exists stop_loss_price real,
  add column if not exists tp1_price real,
  add column if not exists tp2_price real,
  add column if not exists tp3_price real,
  add column if not exists tp1_position_pct real,
  add column if not exists tp2_position_pct real,
  add column if not exists tp3_position_pct real,
  add column if not exists entry_location text,
  add column if not exists liquidity_stability text,
  add column if not exists move_sl_rule text,
  add column if not exists invalidation_type text;

create table if not exists public.capital_adjustments (
  id serial primary key,
  adjustment_type text not null check (adjustment_type in ('add', 'withdraw')),
  amount_usd real not null check (amount_usd > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists trades_closed_at_idx on public.trades (closed_at desc);
create index if not exists trades_mistake_tags_idx on public.trades using gin (mistake_tags);
create index if not exists capital_adjustments_created_at_idx on public.capital_adjustments (created_at desc);
