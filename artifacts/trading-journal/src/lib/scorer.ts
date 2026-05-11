import {
  mapLegacyJournalToEngine,
  scoreEngineTrade,
  toLegacyApiScore,
} from "@workspace/trading-engine";
import type { ScoreResult, Settings, TradeInput, TradeStatus } from "./types";

function toUiStatus(status: string): TradeStatus {
  if (status === "Reject Trade") return "Reject Trade";
  if (status === "Watchlist Only") return "Watchlist Only";
  if (status === "Balanced Trade") return "Balanced Trade";
  if (status === "Aggressive Trade") return "Aggressive Trade";
  return "Asymmetric Swing Trade";
}

export function scoreTradeInput(input: TradeInput, settings?: Settings): ScoreResult {
  const engineInput = mapLegacyJournalToEngine(input);
  const engine = scoreEngineTrade(engineInput, {
    baseAccountEquity: settings?.totalCapital ?? 10_000,
    maxSinglePositionPct: 70,
  });
  const legacy = toLegacyApiScore(engine, engineInput.execution);

  return {
    finalScore: legacy.finalScore,
    tradeStatus: toUiStatus(legacy.tradeStatus),
    suggestedAllocationPct: legacy.suggestedAllocationPct,
    suggestedSlPct: legacy.suggestedSlPct,
    suggestedTpStructure: legacy.suggestedTpStructure,
    suggestedRr: legacy.suggestedRr,
    warnings: legacy.tradeWarnings ? legacy.tradeWarnings.split(" | ") : [],
    finalDecision: legacy.finalDecision,
  };
}
