import type { EngineConfig, LayerScore, TradeClassification } from "../types";
import type { HardFilterOutcome } from "./hard-filters";
import type { ModifierState } from "./modifiers";
import { clamp } from "../math";

export interface ClassificationResult {
  classification: TradeClassification;
  downgradeReasons: string[];
}

const ORDER: TradeClassification[] = [
  "expansion_trade",
  "high_conviction_trade",
  "standard_trade",
  "watchlist_only",
  "reject",
];

function rank(c: TradeClassification): number {
  const i = ORDER.indexOf(c);
  return i >= 0 ? i : ORDER.length - 1;
}

const DEPLOYMENT_LADDER: TradeClassification[] = [
  "expansion_trade",
  "high_conviction_trade",
  "standard_trade",
  "watchlist_only",
];

/** One step = one notch less aggressive (never converts watchlist → reject). */
export function downgradeDeployableClass(c: TradeClassification, steps: number): TradeClassification {
  if (steps <= 0 || c === "reject") return c;
  let idx = DEPLOYMENT_LADDER.indexOf(c);
  if (idx < 0) idx = DEPLOYMENT_LADDER.length - 1;
  idx = Math.min(idx + steps, DEPLOYMENT_LADDER.length - 1);
  return DEPLOYMENT_LADDER[idx];
}

export function classifyFromScore(
  score: number,
  cfg: EngineConfig,
  hard: HardFilterOutcome,
  mod: ModifierState,
  layers: LayerScore[],
  compressionAggressionSteps: number,
): ClassificationResult {
  const downgradeReasons: string[] = [];
  const t = cfg.classificationThresholds;

  if (hard.rejected) {
    return { classification: "reject", downgradeReasons: ["Hard filter rejection."] };
  }

  let c: TradeClassification;
  if (score <= t.rejectMax) {
    c = "reject";
  } else if (score <= t.watchlistMax) {
    c = "watchlist_only";
  } else if (score <= t.standardMax) {
    c = "standard_trade";
  } else if (score <= t.highConvictionMax) {
    c = "high_conviction_trade";
  } else {
    c = "expansion_trade";
  }

  if (hard.forcedWatchlist || mod.negativeSynergies.includes("N3")) {
    if (c !== "reject" && rank(c) < rank("watchlist_only")) {
      downgradeReasons.push("Forced watchlist (event risk / negative synergy N3).");
      c = "watchlist_only";
    }
  }

  const structure100 = layers.find((l) => l.layer === "structure")?.score100 ?? 0;
  const momentum100 = layers.find((l) => l.layer === "momentum")?.score100 ?? 0;

  const hardPenaltyBlock = mod.negativeSynergies.includes("N2");

  if (c === "expansion_trade") {
    if (!mod.expansionEligibleFromSynergy) {
      c = "high_conviction_trade";
      downgradeReasons.push("Expansion requires S1 synergy cluster.");
    } else if (hardPenaltyBlock) {
      c = "high_conviction_trade";
      downgradeReasons.push("Active penalty synergy blocks expansion profile.");
    } else if (!(structure100 > 80 && momentum100 > 75)) {
      c = "high_conviction_trade";
      downgradeReasons.push("Expansion requires structure >80 and momentum >75.");
    }
  }

  if (hard.maxClassification) {
    if (rank(c) < rank(hard.maxClassification)) {
      downgradeReasons.push(`Classification capped by hard rule (max ${hard.maxClassification}).`);
      c = hard.maxClassification;
    }
  }

  if (c !== "reject") {
    const before = c;
    c = downgradeDeployableClass(c, compressionAggressionSteps);
    if (c !== before) {
      downgradeReasons.push("Risk compression: aggression ladder stepped down.");
    }
  }

  return { classification: c, downgradeReasons };
}

export function aggressionFromClassification(
  c: TradeClassification,
  ceiling: HardFilterOutcome["aggressionCeiling"],
): import("../types").AggressionLevel {
  const base: Record<TradeClassification, import("../types").AggressionLevel> = {
    reject: "none",
    watchlist_only: "cautious",
    standard_trade: "standard",
    high_conviction_trade: "elevated",
    expansion_trade: "maximum",
  };
  let level = base[c];
  const order: import("../types").AggressionLevel[] = [
    "none",
    "cautious",
    "standard",
    "elevated",
    "maximum",
  ];
  const capIdx =
    ceiling === "maximum"
      ? 4
      : ceiling === "elevated"
        ? 3
        : ceiling === "standard"
          ? 2
          : 1;
  const curIdx = order.indexOf(level);
  level = order[Math.min(curIdx, capIdx)];
  return level;
}

export function confidenceStability(layers: LayerScore[], finalScore: number): number {
  const vals = layers.map((l) => l.score100);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const varSum = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  const disagreement = Math.sqrt(varSum);
  const base = clamp(100 - disagreement * 0.45, 40, 100);
  const scoreAdj = finalScore >= 60 && finalScore <= 70 ? -8 : 0;
  return clamp(Math.round((base + scoreAdj) * 10) / 10, 0, 100);
}
