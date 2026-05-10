"use server";

import {
  engineTradeInputSchema,
  scoreEngineTrade,
  userRiskSettingsSchema,
  type EngineScoreResult,
} from "@workspace/trading-engine";

export type ScoreTradeActionState =
  | { ok: true; result: EngineScoreResult }
  | { ok: false; error: string };

/**
 * Pure scoring server action — no persistence. Wire the existing UI to this for live previews.
 */
export async function scoreTradeAction(
  rawInput: unknown,
  rawUserSettings?: unknown,
): Promise<ScoreTradeActionState> {
  const parsedInput = engineTradeInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return { ok: false, error: parsedInput.error.message };
  }

  const parsedUser = userRiskSettingsSchema.safeParse(
    rawUserSettings ?? {
      baseAccountEquity: 10_000,
      maxSinglePositionPct: 25,
    },
  );
  if (!parsedUser.success) {
    return { ok: false, error: parsedUser.error.message };
  }

  try {
    const result = scoreEngineTrade(parsedInput.data, parsedUser.data);
    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Engine failure";
    return { ok: false, error: msg };
  }
}
