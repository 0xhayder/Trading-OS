import type { EngineTradeInput, HardFilterTrace, TradeClassification } from "../types";
import {
  isBearishTrend,
  isMomentumWeak,
  isNeutralTrend,
  messyLevel,
} from "../factors/strength";

export interface HardFilterOutcome {
  rejected: boolean;
  forcedWatchlist: boolean;
  maxClassification: TradeClassification | null;
  aggressionCeiling: AggressionCeiling;
  allocationCapPct: number | null;
  traces: HardFilterTrace[];
}

export type AggressionCeiling = "maximum" | "elevated" | "standard" | "cautious";

const STANDARD_ONLY: TradeClassification = "standard_trade";

export function runHardFilterEngine(input: EngineTradeInput): HardFilterOutcome {
  const traces: HardFilterTrace[] = [];
  let rejected = false;
  let forcedWatchlist = false;
  let maxClassification: TradeClassification | null = null;
  let aggressionCeiling: AggressionCeiling = "maximum";
  let allocationCapPct: number | null = null;

  const btcBear = isBearishTrend(input.market.btcTrend);
  const altBear = isBearishTrend(input.market.altTrend);
  const breakout = input.structure.setupType === "breakout_retest";

  if (btcBear && altBear && breakout) {
    rejected = true;
    traces.push({
      ruleId: "H1",
      action: "reject",
      detail: "Broad bearish regime with breakout retest — statistical failure cluster.",
    });
    return finish();
  }

  const weakRetest = input.structure.retestConfirmation === "weak";
  if (weakRetest && messyLevel(input.structure.srClarity)) {
    rejected = true;
    traces.push({
      ruleId: "H2",
      action: "reject",
      detail: "Weak retest with messy / forced structure — no structural edge.",
    });
    return finish();
  }

  const liqDanger = input.risk.liquidityRisk === "dangerous";
  const euphoric = input.risk.overextension === "euphoric";
  if (liqDanger && euphoric) {
    rejected = true;
    traces.push({
      ruleId: "H3",
      action: "reject",
      detail: "Dangerous liquidity with euphoric extension — liquidation / gap risk.",
    });
    return finish();
  }

  const limitedSpace = input.entry.distanceToResistance === "nearby";
  const poorRr = input.entry.rrQuality === "poor";
  if (limitedSpace && poorRr) {
    rejected = true;
    traces.push({
      ruleId: "H4",
      action: "reject",
      detail: "Limited room to resistance with poor RR — asymmetry breaks down.",
    });
    return finish();
  }

  const highEvent = input.risk.eventRisk === "high";
  if (highEvent && isMomentumWeak(input.momentum)) {
    forcedWatchlist = true;
    traces.push({
      ruleId: "H5",
      action: "watchlist_only",
      detail: "High event risk with weak momentum — observation only.",
    });
  }

  const btcN = isNeutralTrend(input.market.btcTrend);
  const altBr = isBearishTrend(input.market.altTrend);
  const deadNarr = input.market.narrative === "dead";
  if (btcN && altBr && deadNarr) {
    maxClassification = STANDARD_ONLY;
    aggressionCeiling = "standard";
    traces.push({
      ruleId: "H6",
      action: "cap_classification",
      detail: "Neutral BTC, bearish alts, dead narrative — aggressive profiles disabled.",
    });
  }

  function finish(): HardFilterOutcome {
    return {
      rejected,
      forcedWatchlist,
      maxClassification,
      aggressionCeiling,
      allocationCapPct,
      traces,
    };
  }

  return finish();
}
