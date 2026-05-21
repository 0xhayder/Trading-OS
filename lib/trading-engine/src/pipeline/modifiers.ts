import type { EngineConfig, EngineTradeInput, LayerScore } from "../types";
import {
  isBullishTrend,
  isBearishTrend,
  isCandleStrong,
  isFollowThroughStrong,
  isMomentumWeak,
  isVolumeStrong,
} from "../factors/strength";
import { applyMomentumWeightBoost, refreshLayerWeighted, weightedFinalScore } from "./base-layers";
import { clamp, roundTo } from "../math";

export interface ModifierState {
  layers: LayerScore[];
  layerWeights: EngineConfig["layerWeights"];
  finalScore: number;
  conditionalTrace: string[];
  positiveSynergies: string[];
  negativeSynergies: string[];
  expansionEligibleFromSynergy: boolean;
  rrAggressionBoost: number;
  allocationCeilingMultiplier: number;
}

export function applyConditionalAndSynergy(
  input: EngineTradeInput,
  cfg: EngineConfig,
  layers: LayerScore[],
): ModifierState {
  const conditionalTrace: string[] = [];
  let lw = { ...cfg.layerWeights };

  const btcBull = isBullishTrend(input.market.btcTrend);
  const altBull = isBullishTrend(input.market.altTrend);
  if (btcBull && altBull) {
    lw = applyMomentumWeightBoost(lw, 1.2);
    conditionalTrace.push("Market conditions aligned.");
  }

  let working = layers.map((l) => ({ ...l }));

  const patchLayer = (layer: LayerScore["layer"], score100: number) => {
    const i = working.findIndex((x) => x.layer === layer);
    if (i >= 0) {
      const clamped = clamp(score100, 0, 100);
      working[i] = {
        ...working[i],
        score100: roundTo(clamped, 2),
        score: working[i].score,
      };
    }
  };

  const struct = working.find((l) => l.layer === "structure");
  if (
    input.structure.retestConfirmation === "strong" &&
    input.structure.srClarity === "extremely_obvious" &&
    struct
  ) {
    patchLayer("structure", struct.score100 * 1.15);
    conditionalTrace.push("Clean level and confirmation improved structure quality.");
  }

  const ent = working.find((l) => l.layer === "entry");
  if (input.entry.entryEfficiency === "chased" && ent) {
    patchLayer("entry", ent.score100 * 0.7);
    conditionalTrace.push("Chased entry reduced execution quality.");
  }

  working = refreshLayerWeighted(working, lw);

  const mom = working.find((l) => l.layer === "momentum");
  if (input.risk.overextension === "euphoric" && mom) {
    patchLayer("momentum", mom.score100 * 0.6);
    conditionalTrace.push("Euphoric extension reduced usable momentum.");
  }

  const riskLayer = working.find((l) => l.layer === "risk");
  if (input.observableMarket?.btcVolatilityState === "violent" && riskLayer) {
    patchLayer("risk", riskLayer.score100 * 0.55);
    conditionalTrace.push("Violent BTC volatility compressed risk quality.");
  }

  working = refreshLayerWeighted(working, lw);
  let finalScore = weightedFinalScore(working);

  if (
    input.market.narrative === "hot" &&
    isVolumeStrong(input.momentum.relVolume) &&
    isCandleStrong(input.momentum.candleStrength)
  ) {
    finalScore = clamp(finalScore * 1.12, 0, 100);
    conditionalTrace.push("Narrative and volume confirmed the move.");
  }

  const positiveSynergies: string[] = [];
  let expansionEligibleFromSynergy = false;
  let rrAggressionBoost = 0;
  let allocationCeilingMultiplier = 1;

  const s2 =
    input.structure.retestConfirmation === "strong" &&
    input.structure.srClarity === "extremely_obvious" &&
    input.entry.distanceToResistance === "large";
  if (s2) {
    const st = working.find((l) => l.layer === "structure");
    if (st) {
      patchLayer("structure", st.score100 * 1.12);
      working = refreshLayerWeighted(working, lw);
      finalScore = weightedFinalScore(working);
    }
    positiveSynergies.push("S2");
  }

  const s1 =
    btcBull &&
    altBull &&
    input.market.narrative === "hot" &&
    isVolumeStrong(input.momentum.relVolume) &&
    isFollowThroughStrong(input.momentum.expansionVelocity);
  if (s1) {
    finalScore = clamp(finalScore * 1.18, 0, 100);
    positiveSynergies.push("S1");
    expansionEligibleFromSynergy = true;
  }

  const s3 =
    isCandleStrong(input.momentum.candleStrength) &&
    isVolumeStrong(input.momentum.relVolume) &&
    input.momentum.expansionVelocity === "aggressive";
  if (s3) {
    rrAggressionBoost += 0.25;
    positiveSynergies.push("S3");
  }

  const tokenAligned =
    input.observableStructure?.tokenHigherTfStructure === "bullish" &&
    input.observableStructure?.tokenMidTfStructure === "bullish" &&
    input.observableStructure?.tokenLowerTfStructure === "bullish";
  const legacyAligned =
    input.observableStructure?.breakoutState === "clean_breakout" &&
    input.observableStructure?.reclaimStatus === "fully_reclaimed";
  const s4 =
    (tokenAligned || legacyAligned) && input.observableMomentum?.postBreakoutBehavior === "holding";
  if (s4) {
    finalScore = clamp(finalScore * 1.08, 0, 100);
    positiveSynergies.push("S4");
  }

  const negativeSynergies: string[] = [];

  const n1 =
    input.structure.retestConfirmation === "weak" &&
    input.momentum.expansionVelocity === "slow";
  if (n1) {
    finalScore = clamp(finalScore * 0.8, 0, 100);
    negativeSynergies.push("N1");
  }

  const n2 = input.risk.overextension === "euphoric" && input.entry.entryEfficiency === "chased";
  if (n2) {
    allocationCeilingMultiplier *= 0.5;
    negativeSynergies.push("N2");
  }

  const n3 =
    isBearishTrend(input.market.btcTrend) &&
    isMomentumWeak(input.momentum) &&
    input.entry.distanceToResistance === "nearby";
  if (n3) {
    finalScore = clamp(finalScore * 0.72, 0, 100);
    negativeSynergies.push("N3");
  }

  const n4 =
    input.observableMarket?.btcVolatilityState === "violent" &&
    input.market.btcTrend !== "strong_bullish";
  if (n4) {
    finalScore = clamp(finalScore * 0.82, 0, 100);
    allocationCeilingMultiplier *= 0.65;
    negativeSynergies.push("N4");
  }

  return {
    layers: refreshLayerWeighted(working, lw),
    layerWeights: lw,
    finalScore: roundTo(finalScore, 2),
    conditionalTrace,
    positiveSynergies,
    negativeSynergies,
    expansionEligibleFromSynergy,
    rrAggressionBoost,
    allocationCeilingMultiplier,
  };
}
