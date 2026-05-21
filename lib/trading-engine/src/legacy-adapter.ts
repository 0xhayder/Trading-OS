import { classificationToDisplayName } from "./core/classify";
import type { EngineScoreResult, EngineTradeInput, SetupType, TrendScoreLabel } from "./types";

/** Best-effort mapping from the legacy journal string enums → engine inputs. */
export function mapLegacyJournalToEngine(input: {
  coin?: string;
  narrativeCategory?: string;
  marketCapTier?: string;
  btcTrend?: string;
  altTrend?: string;
  tokenHigherTfStructure?: string;
  tokenMidTfStructure?: string;
  tokenLowerTfStructure?: string;
  btcHigherTfStructure?: string;
  btcMidTfStructure?: string;
  altHigherTfStructure?: string;
  altMidTfStructure?: string;
  btcVolatilityState?: string;
  narrativeHeat?: string;
  breakoutState?: string;
  reclaimStatus?: string;
  htfLocation?: string;
  lowerTfEntryStructure?: string;
  volumeState?: string;
  relativeVolume?: string;
  postBreakoutBehavior?: string;
  entryPrice?: number;
  stopLossPrice?: number;
  tp1Price?: number;
  tp2Price?: number;
  tp3Price?: number;
  tp1PositionPct?: number;
  tp2PositionPct?: number;
  tp3PositionPct?: number;
  entryLocation?: string;
  moveSlRule?: string;
  invalidationType?: string;
  btcCondition?: string;
  altCondition?: string;
  narrativeStrength?: string;
  setupType: string;
  levelClarity?: string;
  timeframeAlignment?: string;
  retestQuality?: string;
  volumeStrength?: string;
  candleImpulse?: string;
  followThrough?: string;
  entryDistance?: string;
  spaceToResistance?: string;
  rrQuality?: string;
  overextension: string;
  eventRisk: string;
  liquidityRisk?: string;
  liquidityStability?: string;
  stopLossPct?: number;
  tp1Pct?: number;
  tp2Pct?: number;
}): EngineTradeInput {
  const hasNewMarket = input.btcTrend != null || input.altTrend != null;
  const hasNewTokenStructure = input.tokenHigherTfStructure != null;
  const hasLegacyMarketTf = input.btcHigherTfStructure != null && !hasNewMarket;
  const hasLegacyStructure =
    input.breakoutState != null && !hasNewTokenStructure && !looksLikeTokenStructure(input.breakoutState);
  const hasStructuredInputs =
    hasNewMarket ||
    hasNewTokenStructure ||
    hasLegacyMarketTf ||
    hasLegacyStructure ||
    input.entryPrice != null ||
    input.volumeState != null;

  const execution = buildExecution(input);
  const btcTrend = hasNewMarket
    ? mapMarketTrend(input.btcTrend)
    : hasLegacyMarketTf
      ? deriveTrend(input.btcHigherTfStructure, input.btcMidTfStructure)
      : mapMarketTrend(input.btcCondition);
  const altTrend = hasNewMarket
    ? mapMarketTrend(input.altTrend)
    : hasLegacyMarketTf
      ? deriveTrend(input.altHigherTfStructure, input.altMidTfStructure)
      : mapMarketTrend(input.altCondition);
  const narrative = hasStructuredInputs ? mapNarrativeHeat(input.narrativeHeat) : mapNarrative(input.narrativeStrength);
  const setupType = mapSetup(input.setupType);
  const srClarity = hasNewTokenStructure
    ? deriveSrClarityFromTokenStructure(
        input.tokenHigherTfStructure,
        input.tokenMidTfStructure,
        input.tokenLowerTfStructure,
      )
    : hasLegacyStructure
      ? deriveSrClarity(input.breakoutState, input.reclaimStatus, input.htfLocation)
      : mapSr(input.levelClarity);
  const htfAlignment = hasNewTokenStructure
    ? deriveAlignmentFromTrends(btcTrend, altTrend, input.tokenHigherTfStructure, input.tokenMidTfStructure)
    : hasLegacyMarketTf
      ? deriveAlignment(input.btcHigherTfStructure, input.altHigherTfStructure, input.altMidTfStructure)
      : mapHtf(input.timeframeAlignment);
  const retestConfirmation = hasNewTokenStructure
    ? deriveRetestFromTokenStructure(
        input.tokenHigherTfStructure,
        input.tokenMidTfStructure,
        input.tokenLowerTfStructure,
      )
    : hasLegacyStructure
      ? deriveRetest(input.breakoutState, input.reclaimStatus, input.lowerTfEntryStructure)
      : mapRetest(input.retestQuality);
  const liquiditySpace = hasNewTokenStructure
    ? deriveLiquiditySpaceFromTokenStructure(input.tokenHigherTfStructure, input.tokenLowerTfStructure, execution)
    : hasLegacyStructure
      ? deriveLiquiditySpace(input.htfLocation, execution)
      : mapLiquiditySpaceFromResistance(input.spaceToResistance);

  const relVolume = hasStructuredInputs ? mapRelativeVolume(input.relativeVolume) : mapRelVol(input.volumeStrength);
  const candleStrength = hasStructuredInputs ? deriveCandle(input.volumeState) : mapCandle(input.candleImpulse);
  const expansionVelocity = hasStructuredInputs
    ? mapPostBreakoutBehavior(input.postBreakoutBehavior)
    : mapVelocity(input.followThrough);
  const volumeToMcapRatio = hasStructuredInputs
    ? inferVolumeMcapFromStructured(input.volumeState, input.marketCapTier)
    : inferVolumeMcapFromLegacy(input.volumeStrength);

  const rrNumeric = executionRr(execution) ?? computeRrFromPct(input.stopLossPct, input.tp1Pct, input.tp2Pct, input.rrQuality);
  const rrQuality = mapRrQualityBand(input.rrQuality ?? "", rrNumeric);
  const entryEfficiency = hasStructuredInputs ? mapEntryLocation(input.entryLocation) : mapEntryEfficiency(input.entryDistance);
  const distanceToResistance = hasNewTokenStructure
    ? deriveDistanceToResistanceFromToken(input.tokenHigherTfStructure, input.tokenLowerTfStructure, execution)
    : hasLegacyStructure
      ? deriveDistanceToResistance(input.htfLocation, execution)
      : mapResistance(input.spaceToResistance);
  const slEfficiency = hasStructuredInputs
    ? Number.isFinite(Number(input.entryPrice)) &&
        Number(input.entryPrice) > 0 &&
        Number.isFinite(Number(input.stopLossPrice)) &&
        Number(input.stopLossPrice) > 0
      ? inferSlFromPrices(
          input.entryPrice,
          input.stopLossPrice,
          hasNewTokenStructure ? tokenStructureToHtfLocation(input.tokenLowerTfStructure) : input.htfLocation,
        )
      : inferSlFromRr(input.rrQuality, execution.stopLossPct)
    : inferSlFromRr(input.rrQuality, input.stopLossPct);

  return {
    identity: {
      coin: input.coin,
      narrativeCategory: input.narrativeCategory,
      marketCapTier: mapMarketCapTier(input.marketCapTier),
    },
    observableMarket: hasStructuredInputs
      ? {
          btcTrend,
          altTrend,
          btcVolatilityState: mapVolatility(input.btcVolatilityState),
          narrativeHeat: mapHeatRaw(input.narrativeHeat),
          ...(hasLegacyMarketTf
            ? {
                btcHigherTfStructure: mapStructureBias(input.btcHigherTfStructure),
                btcMidTfStructure: mapStructureBias(input.btcMidTfStructure),
                altHigherTfStructure: mapStructureBias(input.altHigherTfStructure),
                altMidTfStructure: mapStructureBias(input.altMidTfStructure),
              }
            : {}),
        }
      : undefined,
    observableStructure:
      hasNewTokenStructure || hasLegacyStructure
        ? {
            tokenHigherTfStructure: mapTokenStructure(
              input.tokenHigherTfStructure ?? legacyBreakoutToTokenHigher(input.breakoutState),
            ),
            tokenMidTfStructure: mapTokenStructure(
              input.tokenMidTfStructure ?? legacyReclaimToTokenMid(input.reclaimStatus),
            ),
            tokenLowerTfStructure: mapTokenStructure(
              input.tokenLowerTfStructure ?? legacyLowerTfToTokenLower(input.lowerTfEntryStructure),
            ),
            ...(hasLegacyStructure
              ? {
                  breakoutState: mapBreakoutState(input.breakoutState),
                  reclaimStatus: mapReclaimStatus(input.reclaimStatus),
                  htfLocation: mapHtfLocation(input.htfLocation),
                  lowerTfEntryStructure: mapLowerTf(input.lowerTfEntryStructure),
                }
              : {}),
          }
        : undefined,
    observableMomentum: hasStructuredInputs
      ? {
          volumeState: mapVolumeState(input.volumeState),
          relativeVolume: mapRelativeVolumeRaw(input.relativeVolume),
          postBreakoutBehavior: mapPostBreakoutRaw(input.postBreakoutBehavior),
        }
      : undefined,
    managementPlan: hasStructuredInputs
      ? {
          moveSlRule: mapMoveSlRule(input.moveSlRule),
          invalidationType: mapInvalidationType(input.invalidationType),
        }
      : undefined,
    market: { btcTrend, altTrend, narrative },
    structure: {
      setupType,
      srClarity,
      retestConfirmation,
      htfAlignment,
      liquiditySpace,
    },
    momentum: {
      volumeToMcapRatio,
      relVolume,
      candleStrength,
      expansionVelocity,
    },
    entry: {
      rrNumeric,
      rrQuality,
      entryEfficiency,
      distanceToResistance,
      slEfficiency,
    },
    risk: {
      overextension: mapOverextension(input.overextension),
      eventRisk: mapEventRisk(input.eventRisk),
      liquidityRisk: hasStructuredInputs
        ? mapLiquidityStability(input.liquidityStability)
        : mapLiquidityRisk(input.liquidityRisk),
    },
    execution,
  };
}

function buildExecution(input: {
  entryPrice?: number;
  stopLossPrice?: number;
  tp1Price?: number;
  tp2Price?: number;
  tp3Price?: number;
  tp1PositionPct?: number;
  tp2PositionPct?: number;
  tp3PositionPct?: number;
  stopLossPct?: number;
  tp1Pct?: number;
  tp2Pct?: number;
}): NonNullable<EngineTradeInput["execution"]> {
  const entry = Number(input.entryPrice);
  const stop = Number(input.stopLossPrice);
  if (Number.isFinite(entry) && entry > 0 && Number.isFinite(stop) && stop > 0) {
    const stopLossPct = Math.abs(((entry - stop) / entry) * 100);
    return {
      stopLossPct,
      tp1Pct: targetPct(entry, input.tp1Price),
      tp2Pct: targetPct(entry, input.tp2Price),
      tp3Pct: targetPct(entry, input.tp3Price),
      tp1PositionPct: safePct(input.tp1PositionPct),
      tp2PositionPct: safePct(input.tp2PositionPct),
      tp3PositionPct: safePct(input.tp3PositionPct),
    };
  }
  return {
    stopLossPct: input.stopLossPct ?? 0,
    tp1Pct: input.tp1Pct ?? 0,
    tp2Pct: input.tp2Pct ?? 0,
  };
}

function targetPct(entry: number, target: unknown): number {
  const price = Number(target);
  if (!Number.isFinite(price) || price <= 0 || entry <= 0) return 0;
  return Math.max(((price - entry) / entry) * 100, 0);
}

function safePct(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function executionRr(exec: EngineTradeInput["execution"]): number | undefined {
  if (!exec || exec.stopLossPct <= 0) return undefined;
  const legs = [
    { target: exec.tp1Pct, weight: exec.tp1PositionPct },
    { target: exec.tp2Pct, weight: exec.tp2PositionPct },
    { target: exec.tp3Pct ?? 0, weight: exec.tp3PositionPct },
  ].filter((leg) => leg.target > 0);
  if (legs.length === 0) return undefined;
  const weightTotal = legs.reduce((sum, leg) => sum + (leg.weight ?? 0), 0);
  if (weightTotal > 0) {
    return legs.reduce((sum, leg) => sum + (leg.target / exec.stopLossPct) * ((leg.weight ?? 0) / weightTotal), 0);
  }
  return legs.reduce((sum, leg) => sum + leg.target / exec.stopLossPct, 0) / legs.length;
}

function mapStructureBias(s?: string): NonNullable<EngineTradeInput["observableMarket"]>["btcHigherTfStructure"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("bear")) return "bearish";
  if (x.includes("bull")) return "bullish";
  return "neutral";
}

function deriveTrend(higher?: string, mid?: string): TrendScoreLabel {
  const h = mapStructureBias(higher);
  const m = mapStructureBias(mid);
  if (h === "bullish" && m === "bullish") return "strong_bullish";
  if (h === "bearish" && m === "bearish") return "strong_bearish";
  if (h === "bullish" || m === "bullish") return "bullish";
  if (h === "bearish" || m === "bearish") return "bearish";
  return "neutral";
}

function mapNarrativeHeat(s?: string): EngineTradeInput["market"]["narrative"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("euphor") || x.includes("hot")) return "hot";
  if (x.includes("active")) return "active";
  if (x.includes("weak")) return "weak";
  if (x.includes("dead")) return "dead";
  return "neutral";
}

function mapHeatRaw(s?: string): NonNullable<EngineTradeInput["observableMarket"]>["narrativeHeat"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("euphor")) return "euphoric";
  if (x.includes("hot")) return "hot";
  if (x.includes("active")) return "active";
  if (x.includes("weak")) return "weak";
  return "dead";
}

function mapVolatility(s?: string): NonNullable<EngineTradeInput["observableMarket"]>["btcVolatilityState"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("violent")) return "violent";
  if (x.includes("elevated")) return "elevated";
  return "calm";
}

function mapBreakoutState(s?: string): NonNullable<EngineTradeInput["observableStructure"]>["breakoutState"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("wick")) return "wick_breakout";
  if (x.includes("no")) return "no_breakout";
  return "clean_breakout";
}

function mapReclaimStatus(s?: string): NonNullable<EngineTradeInput["observableStructure"]>["reclaimStatus"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("lost")) return "lost_level";
  if (x.includes("attempt")) return "attempting_reclaim";
  return "fully_reclaimed";
}

function mapHtfLocation(s?: string): NonNullable<EngineTradeInput["observableStructure"]>["htfLocation"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("support")) return "major_support";
  if (x.includes("resistance")) return "near_resistance";
  if (x.includes("discovery")) return "price_discovery";
  return "mid_range";
}

function mapLowerTf(s?: string): NonNullable<EngineTradeInput["observableStructure"]>["lowerTfEntryStructure"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("weak")) return "weak";
  if (x.includes("bull")) return "bullish";
  return "neutral";
}

function deriveSrClarity(breakout?: string, reclaim?: string, location?: string): EngineTradeInput["structure"]["srClarity"] {
  const b = mapBreakoutState(breakout);
  const r = mapReclaimStatus(reclaim);
  const l = mapHtfLocation(location);
  if (b === "clean_breakout" && r === "fully_reclaimed") return l === "major_support" ? "extremely_obvious" : "clean";
  if (b === "wick_breakout" || r === "attempting_reclaim") return "medium";
  return "forced";
}

function deriveRetest(
  breakout?: string,
  reclaim?: string,
  lower?: string,
): EngineTradeInput["structure"]["retestConfirmation"] {
  const b = mapBreakoutState(breakout);
  const r = mapReclaimStatus(reclaim);
  const l = mapLowerTf(lower);
  if (b === "clean_breakout" && r === "fully_reclaimed" && l === "bullish") return "strong";
  if (r === "fully_reclaimed" || l === "bullish") return "decent";
  if (b === "no_breakout" || r === "lost_level") return "none";
  return "weak";
}

function deriveAlignment(btcHigher?: string, altHigher?: string, altMid?: string): EngineTradeInput["structure"]["htfAlignment"] {
  const btc = mapStructureBias(btcHigher);
  const ah = mapStructureBias(altHigher);
  const am = mapStructureBias(altMid);
  if (btc === "bullish" && ah === "bullish" && am === "bullish") return "full";
  if (btc === "bearish" || ah === "bearish") return "conflict";
  return "partial";
}

function deriveLiquiditySpace(location?: string, exec?: EngineTradeInput["execution"]): EngineTradeInput["structure"]["liquiditySpace"] {
  const l = mapHtfLocation(location);
  if (l === "price_discovery" || l === "major_support") return "major_clean";
  if (l === "near_resistance") return "heavy_resistance";
  if ((executionRr(exec) ?? 0) >= 3) return "major_clean";
  return "moderate";
}

function mapRelativeVolume(s?: string): EngineTradeInput["momentum"]["relVolume"] {
  const raw = mapRelativeVolumeRaw(s);
  if (raw === "extreme") return "above_2x";
  if (raw === "high") return "one_point_five_x";
  if (raw === "below_average") return "below_average";
  return "average";
}

function mapRelativeVolumeRaw(s?: string): NonNullable<EngineTradeInput["observableMomentum"]>["relativeVolume"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("extreme")) return "extreme";
  if (x.includes("high")) return "high";
  if (x.includes("below")) return "below_average";
  return "average";
}

function mapVolumeState(s?: string): NonNullable<EngineTradeInput["observableMomentum"]>["volumeState"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("extreme")) return "extreme_expansion";
  if (x.includes("expansion")) return "expansion";
  if (x.includes("weak")) return "weak";
  return "normal";
}

function deriveCandle(s?: string): EngineTradeInput["momentum"]["candleStrength"] {
  const v = mapVolumeState(s);
  if (v === "extreme_expansion") return "explosive";
  if (v === "expansion") return "strong";
  if (v === "weak") return "weak";
  return "strong";
}

function mapPostBreakoutBehavior(s?: string): EngineTradeInput["momentum"]["expansionVelocity"] {
  const raw = mapPostBreakoutRaw(s);
  if (raw === "immediate_continuation") return "aggressive";
  if (raw === "holding") return "healthy";
  return "slow";
}

function mapPostBreakoutRaw(s?: string): NonNullable<EngineTradeInput["observableMomentum"]>["postBreakoutBehavior"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("immediate")) return "immediate_continuation";
  if (x.includes("holding")) return "holding";
  if (x.includes("failing")) return "failing";
  return "stalling";
}

function inferVolumeMcapFromStructured(volume?: string, tier?: string): number {
  const v = mapVolumeState(volume);
  const base = v === "extreme_expansion" ? 1 : v === "expansion" ? 0.7 : v === "normal" ? 0.35 : 0.12;
  const tierAdj = (tier ?? "").toLowerCase().includes("small") ? 0.1 : 0;
  return Math.min(base + tierAdj, 1.2);
}

function mapEntryLocation(s?: string): EngineTradeInput["entry"]["entryEfficiency"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("key")) return "perfect";
  if (x.includes("chased")) return "chased";
  return "decent";
}

function deriveDistanceToResistance(location?: string, exec?: EngineTradeInput["execution"]): EngineTradeInput["entry"]["distanceToResistance"] {
  const l = mapHtfLocation(location);
  if (l === "near_resistance") return "nearby";
  const rr = executionRr(exec) ?? 0;
  if (l === "price_discovery" || rr >= 3.5) return "large";
  return "decent";
}

function inferSlFromPrices(entry?: number, stop?: number, location?: string): EngineTradeInput["entry"]["slEfficiency"] {
  const e = Number(entry);
  const s = Number(stop);
  if (!Number.isFinite(e) || !Number.isFinite(s) || e <= 0 || s <= 0) return "acceptable";
  const pct = Math.abs(((e - s) / e) * 100);
  if (pct <= 6 && mapHtfLocation(location) !== "near_resistance") return "structural";
  if (pct <= 10) return "acceptable";
  return "poor";
}

function mapMarketCapTier(s?: string): NonNullable<EngineTradeInput["identity"]>["marketCapTier"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("small")) return "small_cap";
  if (x.includes("large")) return "large_cap";
  return "mid_cap";
}

function mapMoveSlRule(s?: string): NonNullable<EngineTradeInput["managementPlan"]>["moveSlRule"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("tp1")) return "after_tp1";
  if (x.includes("structure")) return "after_structure_shift";
  if (x.includes("manual")) return "manual";
  return "never";
}

function mapInvalidationType(s?: string): NonNullable<EngineTradeInput["managementPlan"]>["invalidationType"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("support")) return "support_loss";
  if (x.includes("volume")) return "volume_failure";
  if (x.includes("btc")) return "btc_weakness";
  return "structure_loss";
}

function mapMarketTrend(s?: string): TrendScoreLabel {
  const x = (s ?? "").toLowerCase();
  if (x.includes("extreme") && x.includes("bull")) return "strong_bullish";
  if (x.includes("strong") && x.includes("bull")) return "strong_bullish";
  if (x.includes("bull")) return "bullish";
  if (x.includes("extreme") && x.includes("bear")) return "strong_bearish";
  if (x.includes("strong") && x.includes("bear")) return "strong_bearish";
  if (x.includes("bear")) return "bearish";
  return "neutral";
}

function looksLikeTokenStructure(value?: string): boolean {
  const x = (value ?? "").toLowerCase();
  return x === "bullish" || x === "ranging" || x === "bearish";
}

function mapTokenStructure(s?: string): NonNullable<EngineTradeInput["observableStructure"]>["tokenHigherTfStructure"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("bear")) return "bearish";
  if (x.includes("range")) return "ranging";
  return "bullish";
}

function legacyBreakoutToTokenHigher(breakout?: string): string {
  const x = (breakout ?? "").toLowerCase();
  if (x.includes("no")) return "Bearish";
  if (x.includes("wick")) return "Ranging";
  return "Bullish";
}

function legacyReclaimToTokenMid(reclaim?: string): string {
  const x = (reclaim ?? "").toLowerCase();
  if (x.includes("lost")) return "Bearish";
  if (x.includes("attempt")) return "Ranging";
  return "Bullish";
}

function legacyLowerTfToTokenLower(lower?: string): string {
  const x = (lower ?? "").toLowerCase();
  if (x.includes("weak") || x.includes("bear")) return "Bearish";
  if (x.includes("neutral") || x.includes("range")) return "Ranging";
  return "Bullish";
}

function tokenStructureToHtfLocation(lower?: string): string | undefined {
  const s = mapTokenStructure(lower);
  if (s === "bearish") return "Near Resistance";
  if (s === "bullish") return "At Major Support";
  return "Mid Range";
}

function deriveSrClarityFromTokenStructure(higher?: string, mid?: string, lower?: string): EngineTradeInput["structure"]["srClarity"] {
  const h = mapTokenStructure(higher);
  const m = mapTokenStructure(mid);
  const l = mapTokenStructure(lower);
  if (h === "bullish" && m === "bullish" && l === "bullish") return "extremely_obvious";
  if (h === "bullish" && m === "bullish") return "clean";
  if (l === "bearish" || (h === "bearish" && m === "bearish")) return "forced";
  if (m === "ranging" || l === "ranging") return "medium";
  return "clean";
}

function deriveRetestFromTokenStructure(
  higher?: string,
  mid?: string,
  lower?: string,
): EngineTradeInput["structure"]["retestConfirmation"] {
  const h = mapTokenStructure(higher);
  const m = mapTokenStructure(mid);
  const l = mapTokenStructure(lower);
  if (h === "bullish" && m === "bullish" && l === "bullish") return "strong";
  if (l === "bullish" || m === "bullish") return "decent";
  if (l === "bearish" || h === "bearish") return "none";
  return "weak";
}

function deriveAlignmentFromTrends(
  btcTrend: TrendScoreLabel,
  altTrend: TrendScoreLabel,
  tokenHigher?: string,
  tokenMid?: string,
): EngineTradeInput["structure"]["htfAlignment"] {
  const btcBull = btcTrend === "bullish" || btcTrend === "strong_bullish";
  const altBull = altTrend === "bullish" || altTrend === "strong_bullish";
  const th = mapTokenStructure(tokenHigher);
  const tm = mapTokenStructure(tokenMid);
  if (btcBull && altBull && th === "bullish" && tm === "bullish") return "full";
  if (btcTrend === "bearish" || btcTrend === "strong_bearish" || altTrend === "bearish" || altTrend === "strong_bearish") {
    return "conflict";
  }
  if (th === "bearish") return "conflict";
  return "partial";
}

function deriveLiquiditySpaceFromTokenStructure(
  higher?: string,
  lower?: string,
  exec?: EngineTradeInput["execution"],
): EngineTradeInput["structure"]["liquiditySpace"] {
  const h = mapTokenStructure(higher);
  const l = mapTokenStructure(lower);
  if (l === "bullish" && h === "bullish") return "major_clean";
  if (l === "bearish" || h === "bearish") return "heavy_resistance";
  if ((executionRr(exec) ?? 0) >= 3) return "major_clean";
  return "moderate";
}

function deriveDistanceToResistanceFromToken(
  higher?: string,
  lower?: string,
  exec?: EngineTradeInput["execution"],
): EngineTradeInput["entry"]["distanceToResistance"] {
  const h = mapTokenStructure(higher);
  const l = mapTokenStructure(lower);
  if (l === "bearish" || h === "bearish") return "nearby";
  const rr = executionRr(exec) ?? 0;
  if (l === "bullish" && rr >= 3.5) return "large";
  return "decent";
}

function mapNarrative(s?: string): EngineTradeInput["market"]["narrative"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("hot")) return "hot";
  if (x.includes("active")) return "active";
  if (x.includes("weak")) return "weak";
  if (x.includes("dead")) return "dead";
  return "neutral";
}

function mapSetup(s: string): SetupType {
  const x = s.toLowerCase();
  if (x.includes("double")) return "double_bottom";
  if (x.includes("trendline")) return "trendline_reclaim";
  if (x.includes("continuation")) return "trend_continuation";
  return "breakout_retest";
}

function mapSr(s?: string): EngineTradeInput["structure"]["srClarity"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("obvious") || x.includes("extreme")) return "extremely_obvious";
  if (x.includes("forced") || x.includes("messy")) return "forced";
  if (x.includes("decent") || x.includes("clean")) return "clean";
  return "medium";
}

function mapHtf(s?: string): EngineTradeInput["structure"]["htfAlignment"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("full")) return "full";
  if (x.includes("partial")) return "partial";
  if (x.includes("counter")) return "conflict";
  return "partial";
}

function mapRetest(s?: string): EngineTradeInput["structure"]["retestConfirmation"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("strong")) return "strong";
  if (x.includes("acceptable") || x.includes("decent")) return "decent";
  if (x.includes("weak")) return "weak";
  return "none";
}

function mapLiquiditySpaceFromResistance(s?: string): EngineTradeInput["structure"]["liquiditySpace"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("large")) return "major_clean";
  if (x.includes("limited") || x.includes("tight")) return "heavy_resistance";
  return "moderate";
}

function mapRelVol(s?: string): EngineTradeInput["momentum"]["relVolume"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("strong") || x.includes("expansion")) return "above_2x";
  if (x.includes("normal")) return "average";
  if (x.includes("weak")) return "below_average";
  return "one_point_five_x";
}

function inferVolumeMcapFromLegacy(s?: string): number {
  const x = (s ?? "").toLowerCase();
  if (x.includes("strong") || x.includes("expansion")) return 0.85;
  if (x.includes("normal")) return 0.35;
  return 0.15;
}

function mapCandle(s?: string): EngineTradeInput["momentum"]["candleStrength"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("explosive")) return "explosive";
  if (x.includes("strong")) return "strong";
  if (x.includes("weak")) return "weak";
  return "strong";
}

function mapVelocity(s?: string): EngineTradeInput["momentum"]["expansionVelocity"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("continuation") || x.includes("present")) return "aggressive";
  if (x.includes("slowing")) return "healthy";
  if (x.includes("failing")) return "slow";
  return "healthy";
}

function mapEntryEfficiency(s?: string): EngineTradeInput["entry"]["entryEfficiency"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("optimal") || x.includes("perfect")) return "perfect";
  if (x.includes("extended") || x.includes("chase")) return "chased";
  return "decent";
}

function mapResistance(s?: string): EngineTradeInput["entry"]["distanceToResistance"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("large")) return "large";
  if (x.includes("limited")) return "nearby";
  return "decent";
}

function mapRrQualityBand(q: string, rrNumeric: number): EngineTradeInput["entry"]["rrQuality"] {
  const x = q.toLowerCase();
  if (x.includes("poor")) return "poor";
  if (x.includes("acceptable") || x.includes("2 to 3")) return "acceptable";
  if (x.includes("asymmetric") || x.includes("> 5") || x.includes("3 to 5")) return "strong";
  if (rrNumeric >= 4) return "strong";
  if (rrNumeric >= 2.2) return "acceptable";
  return "acceptable";
}

function computeRrFromPct(sl?: number, tp1?: number, tp2?: number, rrQuality?: string): number {
  if ((sl ?? 0) > 0) {
    const rr = ((tp1 ?? 0) / (sl ?? 1) + (tp2 ?? 0) / (sl ?? 1)) / 2;
    if (Number.isFinite(rr) && rr > 0) return Math.max(rr, 0.25);
  }
  const q = (rrQuality ?? "").toLowerCase();
  if (q.includes("> 5") || q.includes("asymmetric")) return 5.5;
  if (q.includes("3 to 5")) return 4;
  if (q.includes("2 to 3") || q.includes("acceptable")) return 2.5;
  return 1.5;
}

function inferSlFromRr(
  rrQuality?: string,
  stopLossPct?: number,
): EngineTradeInput["entry"]["slEfficiency"] {
  const q = (rrQuality ?? "").toLowerCase();
  if (q.includes("poor")) return "poor";
  if ((stopLossPct ?? 0) > 6) return "acceptable";
  return "structural";
}

function mapOverextension(s: string): EngineTradeInput["risk"]["overextension"] {
  const x = s.toLowerCase();
  if (x.includes("euphor") || x.includes("panic")) return "euphoric";
  if (x.includes("extend")) return "extended";
  return "controlled";
}

function mapEventRisk(s: string): EngineTradeInput["risk"]["eventRisk"] {
  const x = s.toLowerCase();
  if (x.includes("high")) return "high";
  if (x.includes("medium") || x.includes("elevated")) return "medium";
  return "low";
}

function mapLiquidityRisk(s?: string): EngineTradeInput["risk"]["liquidityRisk"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("danger")) return "dangerous";
  if (x.includes("acceptable") || x.includes("caution") || x.includes("medium")) return "caution";
  return "safe";
}

function mapLiquidityStability(s?: string): EngineTradeInput["risk"]["liquidityRisk"] {
  const x = (s ?? "").toLowerCase();
  if (x.includes("danger")) return "dangerous";
  if (x.includes("thin") || x.includes("moderate")) return "caution";
  return "safe";
}

/** Flatten engine output for API / DB storage */
export interface LegacyApiScorePayload {
  finalScore: number;
  tradeStatus: string;
  suggestedAllocationPct: number;
  suggestedSlPct: number;
  suggestedTpStructure: string;
  suggestedRr: number;
  tradeWarnings: string;
  calculatedRisk: number;
  expectedProfitPct: number;
  expectedLossPct: number;
  finalDecision: string;
  engineVersion: string;
  classification: string;
  approvalApproved: boolean;
  approvalReason: string;
  scoreBreakdown: unknown;
}

export function toLegacyApiScore(
  engine: EngineScoreResult,
  execution?: { stopLossPct: number; tp1Pct: number; tp2Pct: number; tp3Pct?: number },
): LegacyApiScorePayload {
  const alloc = engine.allocation.targetPct;
  const sl = engine.rrEngine.suggestedSlPct ?? execution?.stopLossPct ?? 1;
  const tp2 = execution?.tp2Pct ?? 0;
  const calculatedRisk = alloc > 0 ? Math.round((sl / 100) * alloc * 100) / 100 : 0;
  const expectedProfitPct = Math.round(alloc * (tp2 / 100) * 100) / 100;
  const expectedLossPct = Math.round(alloc * (sl / 100) * 100) / 100;

  return {
    finalScore: engine.normalizedScore,
    tradeStatus: classificationToDisplayName(engine.classification),
    suggestedAllocationPct: alloc,
    suggestedSlPct: sl,
    suggestedTpStructure:
      execution != null
        ? `${engine.rrEngine.suggestedRrStructure} - TP1 ${roundPct(execution.tp1Pct)}% / TP2 ${roundPct(execution.tp2Pct)}%${execution.tp3Pct ? ` / TP3 ${roundPct(execution.tp3Pct)}%` : ""} (${engine.classification.replace(/_/g, " ")})`
        : engine.rrEngine.suggestedRrStructure,
    suggestedRr: engine.expectedRr,
    tradeWarnings: engine.warnings.join(" | "),
    calculatedRisk,
    expectedProfitPct,
    expectedLossPct,
    finalDecision: engine.approval.approved
      ? `APPROVED — ${engine.classification.replace(/_/g, " ")}`
      : `BLOCKED — ${engine.approval.reason}`,
    engineVersion: engine.engineVersion,
    classification: engine.classification,
    approvalApproved: engine.approval.approved,
    approvalReason: engine.approval.reason,
    scoreBreakdown: {
      combinedRaw: engine.combinedRaw,
      layerScores100: engine.layerScores100,
      layers: engine.layers.map((l) => ({
        layer: l.layer,
        score: l.score,
        score100: l.score100,
        weighted: l.weighted,
      })),
      factors: engine.factorRows,
      allocation: engine.allocation,
      activeSynergies: engine.activeSynergies,
      activePenalties: engine.activePenalties,
      aggressionLevel: engine.aggressionLevel,
      confidenceStability: engine.confidenceStability,
      reasoningSummary: engine.reasoningSummary,
      diagnostics: engine.diagnostics,
      rrEngine: engine.rrEngine,
    },
  };
}

function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}
