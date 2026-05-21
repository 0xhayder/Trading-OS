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
      detail: "Rejected: breakout setup against bearish market conditions.",
    });
    return finish();
  }

  const tokenLowerBearish = input.observableStructure?.tokenLowerTfStructure === "bearish";
  const tokenMidRangingLowerBearish =
    input.observableStructure?.tokenMidTfStructure === "ranging" && tokenLowerBearish;
  if (
    input.observableMarket?.btcVolatilityState === "violent" &&
    btcBear &&
    (breakout ||
      input.observableStructure?.breakoutState === "wick_breakout" ||
      tokenMidRangingLowerBearish)
  ) {
    rejected = true;
    traces.push({
      ruleId: "H1B",
      action: "reject",
      detail: "Rejected: violent bearish BTC makes breakout execution unsafe.",
    });
    return finish();
  }

  const weakRetest = input.structure.retestConfirmation === "weak";
  if (weakRetest && messyLevel(input.structure.srClarity)) {
    rejected = true;
    traces.push({
      ruleId: "H2",
      action: "reject",
      detail: "Rejected: weak confirmation and unclear structure.",
    });
    return finish();
  }

  if (input.observableStructure?.reclaimStatus === "lost_level" || tokenLowerBearish) {
    rejected = true;
    traces.push({
      ruleId: "H2B",
      action: "reject",
      detail: "Rejected: key level is lost.",
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
      detail: "Rejected: dangerous liquidity with euphoric extension.",
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
      detail: "Rejected: poor RR into nearby resistance.",
    });
    return finish();
  }

  const highEvent = input.risk.eventRisk === "high";
  if (highEvent && isMomentumWeak(input.momentum)) {
    forcedWatchlist = true;
    traces.push({
      ruleId: "H5",
      action: "watchlist_only",
      detail: "Watchlist only: high event risk and weak momentum.",
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
      detail: "Aggressive sizing disabled: neutral BTC, bearish alts, dead narrative.",
    });
  }

  if (input.observableMarket?.btcVolatilityState === "violent") {
    aggressionCeiling = "cautious";
    allocationCapPct = 12;
    traces.push({
      ruleId: "H7",
      action: "compress",
      detail: "Cautious only: BTC volatility is violent.",
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
