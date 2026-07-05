-- Risk-based position sizing for Trading OS.
-- Run this in Supabase SQL editor, or apply it as a normal migration.

alter table public.trades
  add column if not exists risk_per_trade_pct real,
  add column if not exists risk_amount_usd real,
  add column if not exists calculated_position_size_usd real,
  add column if not exists allocated_capital_pct real;

alter table public.watchlist
  add column if not exists score_breakdown jsonb,
  add column if not exists risk_per_trade_pct real,
  add column if not exists risk_amount_usd real,
  add column if not exists calculated_position_size_usd real,
  add column if not exists allocated_capital_pct real;

-- Backfill older rows that stored this data in score_breakdown JSON.
update public.trades
set
  risk_per_trade_pct = coalesce(risk_per_trade_pct, nullif(score_breakdown->>'riskPerTradePct', '')::real),
  risk_amount_usd = coalesce(risk_amount_usd, nullif(score_breakdown->>'riskAmountUsd', '')::real),
  calculated_position_size_usd = coalesce(
    calculated_position_size_usd,
    allocated_amount_usd,
    case
      when nullif(score_breakdown->>'riskAmountUsd', '')::real is not null
        and stop_loss_pct > 0
      then nullif(score_breakdown->>'riskAmountUsd', '')::real / (stop_loss_pct / 100.0)
      else null
    end
  ),
  allocated_capital_pct = coalesce(allocated_capital_pct, nullif(score_breakdown->>'allocatedCapitalPct', '')::real)
where score_breakdown is not null;

update public.watchlist
set
  risk_per_trade_pct = coalesce(risk_per_trade_pct, nullif(score_breakdown->>'riskPerTradePct', '')::real),
  risk_amount_usd = coalesce(risk_amount_usd, nullif(score_breakdown->>'riskAmountUsd', '')::real),
  calculated_position_size_usd = coalesce(
    calculated_position_size_usd,
    case
      when nullif(score_breakdown->>'riskAmountUsd', '')::real is not null
        and stop_loss_pct > 0
      then nullif(score_breakdown->>'riskAmountUsd', '')::real / (stop_loss_pct / 100.0)
      else null
    end
  ),
  allocated_capital_pct = coalesce(allocated_capital_pct, nullif(score_breakdown->>'allocatedCapitalPct', '')::real)
where score_breakdown is not null;

create index if not exists trades_risk_per_trade_pct_idx on public.trades (risk_per_trade_pct);
