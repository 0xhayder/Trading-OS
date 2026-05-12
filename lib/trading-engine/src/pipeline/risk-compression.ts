import type { EngineTradeInput, LayerScore } from "../types";
import { isBearishTrend, isBullishTrend } from "../factors/strength";

export interface RiskCompressionResult {
  allocationCoefficient: number;
  aggressionDowngradeSteps: number;
  rrTighten: boolean;
  tpExtensionBlocked: boolean;
  traces: string[];
}

export function runRiskCompressionEngine(
  input: EngineTradeInput,
  finalScore: number,
  layers: LayerScore[],
): RiskCompressionResult {
  const traces: string[] = [];
  let allocationCoefficient = 1;
  let aggressionDowngradeSteps = 0;
  let rrTighten = false;
  let tpExtensionBlocked = false;

  if (finalScore >= 50 && finalScore <= 65) {
    allocationCoefficient *= 0.7;
    traces.push("Uncertainty band (50–65): allocation compression 0.7×.");
  }

  const btc = input.market.btcTrend;
  const alt = input.market.altTrend;
  const disagree =
    (isBullishTrend(btc) && isBearishTrend(alt)) || (isBearishTrend(btc) && isBullishTrend(alt));
  if (disagree) {
    aggressionDowngradeSteps += 1;
    traces.push("Market disagreement (BTC vs alts): aggression class −1.");
  }

  const riskLayer = layers.find((l) => l.layer === "risk");
  if (riskLayer && riskLayer.score < 0) {
    allocationCoefficient *= 0.75;
    rrTighten = true;
    tpExtensionBlocked = true;
    traces.push("Negative risk blend: allocation −25%, RR expansion & TP extension capped.");
  }

  return {
    allocationCoefficient,
    aggressionDowngradeSteps,
    rrTighten,
    tpExtensionBlocked,
    traces,
  };
}
