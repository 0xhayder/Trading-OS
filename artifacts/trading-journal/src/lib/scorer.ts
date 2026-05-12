import {
  buildDecisionPresentation,
  mapLegacyJournalToEngine,
  scoreEngineTrade,
  toLegacyApiScore,
} from "@workspace/trading-engine";
import type { ScoreResult, Settings, TradeInput, TradeStatus } from "./types";

function toUiStatus(status: string): TradeStatus {
  const map: Record<string, TradeStatus> = {
    "Reject Trade": "Reject Trade",
    "Watchlist Only": "Watchlist Only",
    "Standard Trade": "Standard Trade",
    "High Conviction Trade": "High Conviction Trade",
    "Expansion Trade": "Expansion Trade",
    "Balanced Trade": "Balanced Trade",
    "Aggressive Trade": "Aggressive Trade",
    "Asymmetric Swing Trade": "Asymmetric Swing Trade",
  };
  return map[status] ?? "Reject Trade";
}

export function scoreTradeInput(input: TradeInput, settings?: Settings): ScoreResult {
  const engineInput = mapLegacyJournalToEngine(input);
  const engine = scoreEngineTrade(engineInput, {
    baseAccountEquity: settings?.totalCapital ?? 10_000,
    maxSinglePositionPct: 70,
  });
  const legacy = toLegacyApiScore(engine, engineInput.execution);
  const presentation = buildDecisionPresentation(engine, engineInput);

  return {
    finalScore: legacy.finalScore,
    tradeStatus: toUiStatus(legacy.tradeStatus),
    suggestedAllocationPct: legacy.suggestedAllocationPct,
    suggestedSlPct: legacy.suggestedSlPct,
    suggestedTpStructure: legacy.suggestedTpStructure,
    suggestedRr: legacy.suggestedRr,
    warnings: legacy.tradeWarnings ? legacy.tradeWarnings.split(" | ") : [],
    finalDecision: legacy.finalDecision,
    scoredAt: new Date().toISOString(),
    presentation,
  };
}
