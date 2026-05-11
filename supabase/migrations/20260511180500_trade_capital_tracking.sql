alter table public.trades
  add column if not exists allocated_amount_usd real,
  add column if not exists realized_pnl_usd real;
