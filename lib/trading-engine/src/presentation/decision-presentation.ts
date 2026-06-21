import type { EngineScoreResult, EngineTradeInput } from "../types";

export type DominantDecisionState =
  | "execute"
  | "execute_cautiously"
  | "watchlist"
  | "blocked"
  | "hard_reject";

export type PrimaryCtaKind =
  | "log_trade"
  | "log_reduced"
  | "save_watchlist"
  | "log_blocked_soft"
  | "none";

export interface ConflictChip {
  id: string;
  title: string;
  detail: string;
}

export interface TpLegPresentation {
  level: string;
  pct: number;
  purpose: string;
  decayNote: string;
}

export interface DecisionPresentation {
  dominantState: DominantDecisionState;
  headline: string;
  subline: string;
  icon: "check" | "alert-soft" | "eye" | "ban" | "x-octagon";
  primaryCta: { kind: PrimaryCtaKind; label: string; description: string };
  secondaryCta: { label: string; emphasis: "bold" | "normal" };
  tone: {
    borderClass: string;
    bgClass: string;
    accentTextClass: string;
    hidePositiveAccents: boolean;
  };
  opportunityQuality: { score: number; label: string; blurb: string };
  executionPermission: { allowed: boolean; blurb: string };
  marketRegimeSafety: { score: number; blurb: string };
  positionAggression: { label: string; blurb: string };
  riskState: { score: number; blurb: string };
  pillars: {
    structure: { score: number; lines: string[] };
    momentum: { score: number; lines: string[] };
    marketRegime: { score: number; lines: string[] };
    risk: { score: number; lines: string[] };
    finalExecution: { score: number; blurb: string };
  };
  whyThisDecision: string[];
  conflicts: ConflictChip[];
  allocation: {
    suggestedPct: number;
    bandMin: number;
    bandMax: number;
    allocationClass: string;
    aggressionLevel: string;
    expectedVolatility: string;
    capitalExposureQuality: string;
  };
  takeProfitLadder: {
    legs: TpLegPresentation[];
    expectedHold: string;
    playbook: "continuation" | "mean_reversion" | "mixed";
    playbookNote: string;
  };
}

function layer(engine: EngineScoreResult, key: keyof EngineScoreResult["layerScores100"]): number {
  return engine.layerScores100[key] ?? 0;
}

function btcBearish(input: EngineTradeInput): boolean {
  return input.market.btcTrend === "bearish" || input.market.btcTrend === "strong_bearish";
}

function altBearish(input: EngineTradeInput): boolean {
  return input.market.altTrend === "bearish" || input.market.altTrend === "strong_bearish";
}

function altBullish(input: EngineTradeInput): boolean {
  return input.market.altTrend === "bullish" || input.market.altTrend === "strong_bullish";
}

function btcBullish(input: EngineTradeInput): boolean {
  return input.market.btcTrend === "bullish" || input.market.btcTrend === "strong_bullish";
}

function marketDisagreement(input: EngineTradeInput): boolean {
  return (btcBullish(input) && altBearish(input)) || (btcBearish(input) && altBullish(input));
}

function hardFilterRejected(engine: EngineScoreResult): boolean {
  return engine.diagnostics.hardFilters.some((h) => h.action === "reject");
}

function forcedWatchlistHard(engine: EngineScoreResult): boolean {
  return engine.diagnostics.hardFilters.some((h) => h.action === "watchlist_only");
}

function regimeStyleBlock(engine: EngineScoreResult, input: EngineTradeInput): boolean {
  if (engine.activePenalties.includes("N3")) return true;
  if (forcedWatchlistHard(engine)) return true;
  if (btcBearish(input) && input.structure.setupType === "breakout_retest") return true;
  if (marketDisagreement(input)) return true;
  if (engine.diagnostics.riskCompression.some((t) => t.toLowerCase().includes("disagreement"))) return true;
  if (input.risk.eventRisk === "high" && engine.classification === "watchlist_only") return true;
  return false;
}

function opportunityBlend(engine: EngineScoreResult): number {
  return (layer(engine, "structure") + layer(engine, "momentum")) / 2;
}

function buildConflicts(engine: EngineScoreResult, input: EngineTradeInput): ConflictChip[] {
  const out: ConflictChip[] = [];
  const s = layer(engine, "structure");
  const mkt = layer(engine, "market");
  const mom = layer(engine, "momentum");
  const r = layer(engine, "risk");

  if (s >= 62 && mkt < 48) {
    out.push({
      id: "struct_market",
      title: "Structure vs market",
      detail: "The chart story looks good, but the wider market tape does not fully back it.",
    });
  }
  if (mom >= 62 && r < 48) {
    out.push({
      id: "mom_risk",
      title: "Momentum vs risk",
      detail: "Price is moving, yet risk flags say the move may be fragile or crowded.",
    });
  }
  const narrativeHot = input.market.narrative === "hot" || input.market.narrative === "active";
  if (narrativeHot && btcBearish(input)) {
    out.push({
      id: "narr_btc",
      title: "Narrative vs BTC",
      detail: "The story is warm, but BTC is leaning the other way. That mismatch adds doubt.",
    });
  }
  return out;
}

function pillarLines(input: EngineTradeInput): {
  structure: string[];
  momentum: string[];
  marketRegime: string[];
  risk: string[];
} {
  return {
    structure: [
      `Setup: ${input.structure.setupType.replace(/_/g, " ")}`,
      `Token structure alignment: ${input.structure.htfAlignment.replace(/_/g, " ")}`,
      `Confirmation quality: ${input.structure.retestConfirmation}`,
      `Support/resistance clarity: ${input.structure.srClarity.replace(/_/g, " ")}`,
      `Liquidity space: ${input.structure.liquiditySpace.replace(/_/g, " ")}`,
    ],
    momentum: [
      `Volume / market-cap proxy: ${input.momentum.volumeToMcapRatio.toFixed(2)}`,
      `Relative volume: ${input.momentum.relVolume.replace(/_/g, " ")}`,
      `Candle impulse: ${input.momentum.candleStrength}`,
      `Expansion velocity: ${input.momentum.expansionVelocity}`,
    ],
    marketRegime: [
      `BTC: ${input.market.btcTrend.replace(/_/g, " ")}`,
      `Alts: ${input.market.altTrend.replace(/_/g, " ")}`,
      `Sector / story: ${input.market.narrative}`,
    ],
    risk: [
      `Extension: ${input.risk.overextension}`,
      `Liquidity: ${input.risk.liquidityRisk}`,
      `Events: ${input.risk.eventRisk}`,
      `RR: ${input.entry.rrNumeric.toFixed(2)}R / ${input.entry.rrQuality}`,
      `Entry: ${input.entry.entryEfficiency} / SL: ${input.entry.slEfficiency}`,
    ],
  };
}

function volatilityLabel(input: EngineTradeInput): string {
  if (input.risk.overextension === "euphoric") return "High — price has run hard";
  if (input.risk.overextension === "extended") return "Elevated — watch for snapbacks";
  return "Normal for this type of swing";
}

function capitalExposureQuality(engine: EngineScoreResult): string {
  if (engine.confidenceStability >= 78) return "Stable — scores across layers agree";
  if (engine.confidenceStability >= 62) return "Mixed — some layers disagree";
  return "Uneasy — layers point in different directions";
}

function allocationClassLabel(engine: EngineScoreResult): string {
  if (!engine.approval.approved) return "None";
  if (engine.classification === "expansion_trade") return "Asymmetric swing";
  if (engine.classification === "high_conviction_trade") return "Aggressive";
  if (engine.classification === "standard_trade") {
    return engine.aggressionLevel === "cautious" || engine.aggressionLevel === "none" ? "Reduced balanced" : "Balanced";
  }
  return "Watchlist";
}

function playbook(input: EngineTradeInput): { playbook: "continuation" | "mean_reversion" | "mixed"; note: string } {
  if (input.structure.setupType === "double_bottom") {
    return {
      playbook: "mean_reversion",
      note: "This setup type often leans mean-reversion: fade extremes after a clear reclaim.",
    };
  }
  if (input.structure.setupType === "breakout_retest" || input.structure.setupType === "trend_continuation") {
    return {
      playbook: "continuation",
      note: "This path leans trend continuation: add only if the tape keeps proving itself.",
    };
  }
  return {
    playbook: "mixed",
    note: "Mixed playbook: take profits in steps; do not treat it as a straight line.",
  };
}

function holdHint(input: EngineTradeInput): string {
  if (input.structure.htfAlignment === "full") return "If the trade works, plan for a longer hold while token structure stays aligned.";
  if (input.structure.htfAlignment === "conflict") return "Shorter hold is more realistic until token structure resolves.";
  return "Medium hold is typical here unless momentum clearly extends.";
}

function buildTpLegs(input: EngineTradeInput): TpLegPresentation[] {
  const tp1 = input.execution?.tp1Pct ?? 0;
  const tp2 = input.execution?.tp2Pct ?? 0;
  const legs: TpLegPresentation[] = [];
  if (tp1 > 0) {
    legs.push({
      level: "TP1",
      pct: tp1,
      purpose: "Risk reduction — lock partial profit and pay for the risk taken.",
      decayNote: "After TP1, odds of a full runner drop slightly; reassess the trend.",
    });
  }
  if (tp2 > 0) {
    legs.push({
      level: "TP2",
      pct: tp2,
      purpose: "Momentum extraction — capture the main move if follow-through stays clean.",
      decayNote: "After TP2, probability fades more; only strong trends earn a third push.",
    });
  }
  legs.push({
    level: "TP3",
    pct: 0,
    purpose: "Trend expansion — optional runner only when structure and tape stay aligned.",
    decayNote: "Lowest odds zone; size small or skip unless you manage actively.",
  });
  return legs;
}

export function buildDecisionPresentation(
  engine: EngineScoreResult,
  input: EngineTradeInput,
): DecisionPresentation {
  const s100 = layer(engine, "structure");
  const m100 = layer(engine, "momentum");
  const mk100 = layer(engine, "market");
  const r100 = layer(engine, "risk");
  const e100 = layer(engine, "entry");
  const opp = Math.round(((s100 + m100 + e100) / 3) * 10) / 10;
  const pillars = pillarLines(input);
  const conflicts = buildConflicts(engine, input);
  const pb = playbook(input);
  const approved = engine.approval.approved;
  const isRejectClass = engine.classification === "reject";
  const isWatch = engine.classification === "watchlist_only";
  const hardReject = hardFilterRejected(engine) || isRejectClass;
  const regimeBlock = regimeStyleBlock(engine, input);
  const oppBlend = opportunityBlend(engine);

  let dominant: DominantDecisionState;
  let headline: string;
  let subline: string;
  let icon: DecisionPresentation["icon"];
  let primaryCta: DecisionPresentation["primaryCta"];
  let secondaryCta: DecisionPresentation["secondaryCta"];
  let tone: DecisionPresentation["tone"];

  if (hardReject) {
    dominant = "hard_reject";
    headline = "HARD REJECT";
    subline =
      "This idea fails basic checks. It is not a trade the system can stand behind right now.";
    icon = "x-octagon";
    primaryCta = {
      kind: "none",
      label: "No trade log",
      description: "Only option is to go back or dismiss. Do not force size here.",
    };
    secondaryCta = { label: "Dismiss", emphasis: "bold" };
    tone = {
      borderClass: "border-rose-900/70",
      bgClass: "bg-rose-950/40",
      accentTextClass: "text-rose-100",
      hidePositiveAccents: true,
    };
  } else if (isWatch && regimeBlock) {
    dominant = "blocked";
    headline = "BLOCKED";
    subline =
      "Some parts of the setup look fine, but the broad tape or risk picture does not allow a normal entry.";
    icon = "ban";
    primaryCta = {
      kind: "log_blocked_soft",
      label: "Log anyway (not recommended)",
      description: "Muted action — use only if you intentionally break rules and accept extra risk.",
    };
    secondaryCta = { label: "Discard", emphasis: "bold" };
    tone = {
      borderClass: "border-orange-600/60",
      bgClass: "bg-orange-950/30",
      accentTextClass: "text-orange-100",
      hidePositiveAccents: true,
    };
  } else if (isWatch) {
    dominant = "watchlist";
    headline = "WATCHLIST";
    subline = "Interesting idea, but it is not ready. Wait for cleaner confirmation or better location.";
    icon = "eye";
    primaryCta = {
      kind: "save_watchlist",
      label: "Save to watchlist",
      description: "Track it. No size call until the state improves.",
    };
    secondaryCta = { label: "Discard", emphasis: "normal" };
    tone = {
      borderClass: "border-sky-600/50",
      bgClass: "bg-sky-950/25",
      accentTextClass: "text-sky-100",
      hidePositiveAccents: true,
    };
  } else if (approved) {
    const cautiousReason =
      engine.diagnostics.riskCompression.length > 0 ||
      engine.activePenalties.length > 0 ||
      r100 < 54 ||
      s100 < 64 ||
      input.risk.eventRisk === "high" ||
      input.risk.overextension === "extended" ||
      engine.aggressionLevel === "cautious" ||
      engine.aggressionLevel === "standard";

    if (cautiousReason) {
      dominant = "execute_cautiously";
      headline = "EXECUTE CAUTIOUSLY";
      subline =
        "The trade can go ahead, but size and patience must stay smaller because risk or tape mismatch is present.";
      icon = "alert-soft";
      primaryCta = {
        kind: "log_reduced",
        label: "LOG TRADE (reduced size)",
        description: "Use a smaller slice than your max. The engine already leans defensive.",
      };
      secondaryCta = { label: "Discard", emphasis: "normal" };
      tone = {
        borderClass: "border-amber-500/60",
        bgClass: "bg-amber-950/20",
        accentTextClass: "text-amber-100",
        hidePositiveAccents: false,
      };
    } else {
      dominant = "execute";
      headline = "EXECUTE";
      subline = "Aligned tape, structure, and risk checks. You may log at full suggested size within your own limits.";
      icon = "check";
      primaryCta = {
        kind: "log_trade",
        label: "LOG TRADE",
        description: "Normal approval path — still follow your own max loss rules.",
      };
      secondaryCta = { label: "Discard", emphasis: "normal" };
      tone = {
        borderClass: "border-emerald-500/55",
        bgClass: "bg-emerald-950/20",
        accentTextClass: "text-emerald-100",
        hidePositiveAccents: false,
      };
    }
  } else {
    dominant = "blocked";
    headline = "BLOCKED";
    subline = "No deploy state matched. Treat as blocked until inputs or tape improve.";
    icon = "ban";
    primaryCta = {
      kind: "log_blocked_soft",
      label: "Log anyway (not recommended)",
      description: "Muted — only for journaling a skipped idea.",
    };
    secondaryCta = { label: "Discard", emphasis: "bold" };
    tone = {
      borderClass: "border-orange-600/60",
      bgClass: "bg-orange-950/30",
      accentTextClass: "text-orange-100",
      hidePositiveAccents: true,
    };
  }

  const why: string[] = [];
  if (dominant === "blocked" && oppBlend >= 68) {
    why.push(
      "High opportunity quality on paper, but execution is denied because the regime or risk stack does not support a clean entry.",
    );
  }
  if (engine.reasoningSummary) {
    why.push(
      ...engine.reasoningSummary
        .split(".")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((x) => (x.endsWith(".") ? x : `${x}.`)),
    );
  }
  if (btcBearish(input) && input.structure.setupType === "breakout_retest") {
    why.push(
      "Breakout-style trades often fail when BTC is bearish because selling pressure tends to return faster.",
    );
  }
  if (input.entry.rrQuality === "poor" || input.entry.distanceToResistance === "nearby") {
    why.push("Room to resistance or RR quality is tight, so edge is smaller even when mood feels strong.");
  }
  if (input.momentum.expansionVelocity === "aggressive" && input.risk.overextension === "euphoric") {
    why.push("Momentum looks hot, but extension is euphoric — the engine trims aggression to avoid late chase risk.");
  }
  if (why.length === 0) {
    why.push(engine.approval.reason || "No extra story beyond the headline state.");
  }

  const execBlurb = approved
    ? "You are cleared to deploy within the suggested risk band."
    : "No deploy. Treat size as zero unless you deliberately override outside this tool.";

  const regimeBlurb =
    mk100 >= 62
      ? "Broad tape is supportive enough for the idea type you picked."
      : mk100 >= 45
        ? "Tape is mixed — workable only with tighter risk and clear levels."
        : "Tape is hostile or unclear — respect that before adding risk.";

  const riskBlurb =
    r100 >= 58
      ? "Risk stack looks controlled for a normal swing."
      : r100 >= 42
        ? "Risk is elevated — smaller size and faster profit taking make sense."
        : "Risk is heavy — the engine will not act like this is a free pass.";

  return {
    dominantState: dominant,
    headline,
    subline,
    icon,
    primaryCta,
    secondaryCta,
    tone,
    opportunityQuality: {
      score: Math.round(opp),
      label: opp >= 68 ? "Strong" : opp >= 52 ? "Fair" : "Weak",
      blurb: "This is how good the idea looks before the veto and regime layers speak.",
    },
    executionPermission: {
      allowed: approved && dominant !== "hard_reject",
      blurb: execBlurb,
    },
    marketRegimeSafety: {
      score: Math.round(mk100),
      blurb: regimeBlurb,
    },
    positionAggression: {
      label: engine.aggressionLevel.replace(/_/g, " "),
      blurb: `Engine aggression bucket: ${engine.aggressionLevel}. This is not the same as your final size — it guides tone only.`,
    },
    riskState: {
      score: Math.round(r100),
      blurb: riskBlurb,
    },
    pillars: {
      structure: {
        score: Math.round(s100),
        lines: pillars.structure,
      },
      momentum: {
        score: Math.round(m100),
        lines: pillars.momentum,
      },
      marketRegime: {
        score: Math.round(mk100),
        lines: pillars.marketRegime,
      },
      risk: {
        score: Math.round(r100),
        lines: pillars.risk,
      },
      finalExecution: {
        score: Math.round(engine.normalizedScore),
        blurb:
          "This is the post-filter decision score — not a simple average. It already includes penalties, boosts, and veto logic.",
      },
    },
    whyThisDecision: why.slice(0, 8),
    conflicts,
    allocation: {
      suggestedPct: engine.allocation.targetPct,
      bandMin: engine.allocation.minPct,
      bandMax: engine.allocation.maxPct,
      allocationClass: allocationClassLabel(engine),
      aggressionLevel: engine.aggressionLevel,
      expectedVolatility: volatilityLabel(input),
      capitalExposureQuality: capitalExposureQuality(engine),
    },
    takeProfitLadder: {
      legs: buildTpLegs(input),
      expectedHold: holdHint(input),
      playbook: pb.playbook,
      playbookNote: pb.note,
    },
  };
}
