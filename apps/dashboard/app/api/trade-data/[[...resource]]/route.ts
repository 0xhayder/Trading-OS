import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type JsonRow = Record<string, unknown>;
type RouteContext = { params: Promise<{ resource?: string[] }> };

function toFiniteNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function numberFromBreakdown(value: unknown, key: string): number | undefined {
  if (typeof value !== "object" || value == null || Array.isArray(value)) return undefined;
  return toFiniteNumber((value as Record<string, unknown>)[key]);
}

function signedPnlPct(outcome: unknown, pnlPct: unknown): number | null {
  if (outcome === "breakeven") return 0;
  const magnitude = Math.abs(Number(pnlPct));
  if (!Number.isFinite(magnitude)) return null;
  if (outcome === "loss") return -magnitude;
  if (outcome === "win") return magnitude;
  return Number(pnlPct);
}

function calculateRealizedPnlUsd(allocatedAmountUsd: number | undefined, pnlPct: number | null | undefined): number | null {
  if (allocatedAmountUsd == null || pnlPct == null) return null;
  const realized = allocatedAmountUsd * (pnlPct / 100);
  return Math.round(realized * 100) / 100;
}

function splitWarnings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || value.trim() === "") return [];
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function textArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" && value.trim()) return value.split(",").map((item) => item.trim()).filter(Boolean);
  return undefined;
}

const MARKET_TRENDS = new Set(["Extreme Bullish", "Bullish", "Neutral", "Bearish", "Extreme Bearish"]);
const TOKEN_STRUCTURES = new Set(["Bullish", "Ranging", "Bearish"]);

function isMarketTrend(value: unknown): value is string {
  return typeof value === "string" && MARKET_TRENDS.has(value);
}

function isTokenStructure(value: unknown): value is string {
  return typeof value === "string" && TOKEN_STRUCTURES.has(value);
}

function legacyBiasPairToTrend(higher?: string, mid?: string): string {
  const h = (higher ?? "").toLowerCase();
  const m = (mid ?? "").toLowerCase();
  if (h.includes("bull") && m.includes("bull")) return "Extreme Bullish";
  if (h.includes("bear") && m.includes("bear")) return "Extreme Bearish";
  if (h.includes("bull")) return "Bullish";
  if (h.includes("bear")) return "Bearish";
  return "Neutral";
}

function legacyRowToTokenStructure(row: JsonRow): {
  higher: string;
  mid: string;
  lower: string;
} {
  const breakout = row.breakout_state;
  if (isTokenStructure(breakout)) {
    return {
      higher: breakout,
      mid: isTokenStructure(row.reclaim_status) ? String(row.reclaim_status) : "Ranging",
      lower: isTokenStructure(row.lower_tf_entry_structure) ? String(row.lower_tf_entry_structure) : "Ranging",
    };
  }
  const breakoutText = String(breakout ?? "").toLowerCase();
  const reclaimText = String(row.reclaim_status ?? "").toLowerCase();
  const lowerText = String(row.lower_tf_entry_structure ?? "").toLowerCase();
  if (breakoutText.includes("no") || reclaimText.includes("lost")) {
    return { higher: "Bearish", mid: "Bearish", lower: "Bearish" };
  }
  if (breakoutText.includes("clean") && reclaimText.includes("fully")) {
    return {
      higher: "Bullish",
      mid: lowerText.includes("bull") ? "Bullish" : "Ranging",
      lower: lowerText.includes("weak") ? "Bearish" : lowerText.includes("bull") ? "Bullish" : "Ranging",
    };
  }
  return { higher: "Ranging", mid: "Ranging", lower: "Ranging" };
}

function toTrade(row: JsonRow) {
  const token = legacyRowToTokenStructure(row);
  const scoreBreakdown = typeof row.score_breakdown === "object" && row.score_breakdown != null
    ? row.score_breakdown
    : undefined;
  const btcStored = row.btc_higher_tf_structure ?? row.btc_condition;
  const altStored = row.alt_market_higher_tf ?? row.alt_condition;
  const btcTrend = isMarketTrend(btcStored)
    ? String(btcStored)
    : legacyBiasPairToTrend(String(btcStored ?? "Neutral"), String(row.btc_mid_tf_structure ?? "Neutral"));
  const altTrend = isMarketTrend(altStored)
    ? String(altStored)
    : legacyBiasPairToTrend(String(altStored ?? "Neutral"), String(row.alt_market_mid_tf ?? "Neutral"));

  return {
    id: String(row.id),
    coin: String(row.coin ?? ""),
    setupType: String(row.setup_type ?? "Breakout Retest"),
    narrativeCategory: String(row.narrative_category ?? "Other"),
    marketCapTier: String(row.market_cap_tier ?? "Mid Cap"),
    btcTrend,
    altTrend,
    tokenHigherTfStructure: token.higher,
    tokenMidTfStructure: token.mid,
    tokenLowerTfStructure: token.lower,
    btcVolatilityState: String(row.btc_volatility_state ?? "Calm"),
    narrativeHeat: String(row.narrative_heat ?? row.narrative_strength ?? "Active"),
    volumeState: String(row.volume_state ?? row.volume_strength ?? "Normal"),
    relativeVolume: String(row.relative_volume ?? "Average"),
    postBreakoutBehavior: String(row.post_breakout_behavior ?? "Holding"),
    entryPrice: Number(row.entry_price ?? 0),
    stopLossPrice: Number(row.stop_loss_price ?? 0),
    tp1Price: row.tp1_price == null ? undefined : Number(row.tp1_price),
    tp2Price: row.tp2_price == null ? undefined : Number(row.tp2_price),
    tp3Price: row.tp3_price == null ? undefined : Number(row.tp3_price),
    tp1PositionPct: Number(row.tp1_position_pct ?? 40),
    tp2PositionPct: Number(row.tp2_position_pct ?? 40),
    tp3PositionPct: Number(row.tp3_position_pct ?? 20),
    entryLocation: String(row.entry_location ?? row.entry_distance ?? "At Key Level"),
    overextension: String(row.overextension ?? "Calm"),
    eventRisk: String(row.event_risk ?? "Low"),
    liquidityStability: String(row.liquidity_stability ?? row.liquidity_risk ?? "Stable"),
    moveSlRule: String(row.move_sl_rule ?? "After TP1"),
    invalidationType: String(row.invalidation_type ?? "Structure Loss"),
    notes: String(row.notes ?? ""),
    timeframe: String(row.timeframe ?? "Higher/Mid/Lower"),
    btcCondition: String(row.btc_condition ?? "Neutral"),
    altCondition: String(row.alt_condition ?? "Neutral"),
    narrativeStrength: String(row.narrative_strength ?? "Active"),
    levelClarity: String(row.level_clarity ?? "Clean"),
    timeframeAlignment: String(row.timeframe_alignment ?? "Partially Aligned"),
    retestQuality: String(row.retest_quality ?? "Decent"),
    volumeStrength: String(row.volume_strength ?? "Normal"),
    candleImpulse: String(row.candle_impulse ?? "Strong"),
    followThrough: String(row.follow_through ?? "Slowing"),
    stopLossPct: Number(row.stop_loss_pct ?? 0),
    tp1Pct: Number(row.tp1_pct ?? 0),
    tp2Pct: Number(row.tp2_pct ?? 0),
    entryDistance: String(row.entry_distance ?? "Decent"),
    spaceToResistance: String(row.space_to_resistance ?? "Decent Space"),
    rrQuality: String(row.rr_quality ?? "RR 2 to 3"),
    liquidityRisk: String(row.liquidity_risk ?? "Acceptable"),
    finalScore: Number(row.final_score ?? 0),
    tradeStatus: String(row.trade_status ?? "Historical Insight"),
    suggestedAllocationPct: Number(row.suggested_allocation_pct ?? 0),
    suggestedSlPct: Number(row.suggested_sl_pct ?? 0),
    suggestedTpStructure: String(row.suggested_tp_structure ?? ""),
    suggestedRr: Number(row.suggested_rr ?? 0),
    warnings: splitWarnings(row.trade_warnings),
    finalDecision: String(row.final_decision ?? ""),
    scoreBreakdown,
    riskPerTradePct: toFiniteNumber(row.risk_per_trade_pct) ?? numberFromBreakdown(scoreBreakdown, "riskPerTradePct"),
    riskAmountUsd: toFiniteNumber(row.risk_amount_usd) ?? numberFromBreakdown(scoreBreakdown, "riskAmountUsd"),
    calculatedPositionSizeUsd: toFiniteNumber(row.calculated_position_size_usd) ?? toFiniteNumber(row.allocated_amount_usd),
    allocatedCapitalPct: toFiniteNumber(row.allocated_capital_pct) ?? numberFromBreakdown(scoreBreakdown, "allocatedCapitalPct"),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    closedAt: typeof row.closed_at === "string" ? row.closed_at : undefined,
    allocatedAmountUsd: row.allocated_amount_usd == null ? undefined : Number(row.allocated_amount_usd),
    realizedPnlUsd: row.realized_pnl_usd == null ? undefined : Number(row.realized_pnl_usd),
    outcome: typeof row.outcome === "string" ? row.outcome : undefined,
    actualPnlPct: row.actual_pnl_pct == null ? undefined : Number(row.actual_pnl_pct),
    mistakeTags: textArray(row.mistake_tags),
    mistakeNote: typeof row.mistake_note === "string" ? row.mistake_note : undefined,
    closeNotes: typeof row.close_notes === "string" ? row.close_notes : undefined,
    managementNotes: typeof row.management_notes === "string" ? row.management_notes : undefined,
    executionAnalysis: typeof row.execution_analysis === "string" ? row.execution_analysis : undefined,
  };
}

function toTradeInsert(trade: JsonRow) {
  const actualPnlPct = signedPnlPct(trade.outcome, trade.actualPnlPct);
  return {
    coin: trade.coin,
    setup_type: trade.setupType,
    timeframe: trade.timeframe ?? "Higher/Mid/Lower",
    btc_condition: trade.btcCondition ?? trade.btcTrend ?? "Neutral",
    alt_condition: trade.altCondition ?? trade.altTrend ?? "Neutral",
    narrative_strength: trade.narrativeStrength ?? trade.narrativeHeat ?? "Active",
    level_clarity: trade.levelClarity ?? "Clean",
    timeframe_alignment: trade.timeframeAlignment ?? "Derived",
    retest_quality: trade.retestQuality ?? "Derived",
    volume_strength: trade.volumeStrength ?? trade.volumeState ?? "Normal",
    candle_impulse: trade.candleImpulse ?? "Derived",
    follow_through: trade.followThrough ?? trade.postBreakoutBehavior ?? "Holding",
    stop_loss_pct: trade.stopLossPct ?? 0,
    tp1_pct: trade.tp1Pct ?? 0,
    tp2_pct: trade.tp2Pct ?? 0,
    entry_distance: trade.entryDistance ?? trade.entryLocation ?? "At Key Level",
    space_to_resistance: trade.spaceToResistance ?? "Derived",
    rr_quality: trade.rrQuality ?? "Derived",
    overextension: trade.overextension,
    event_risk: trade.eventRisk,
    liquidity_risk: trade.liquidityRisk ?? trade.liquidityStability ?? "Stable",
    narrative_category: trade.narrativeCategory,
    market_cap_tier: trade.marketCapTier,
    btc_higher_tf_structure: trade.btcTrend ?? trade.btcHigherTfStructure ?? "Neutral",
    btc_mid_tf_structure: trade.btcMidTfStructure ?? null,
    alt_market_higher_tf: trade.altTrend ?? trade.altHigherTfStructure ?? "Neutral",
    alt_market_mid_tf: trade.altMidTfStructure ?? null,
    btc_volatility_state: trade.btcVolatilityState,
    narrative_heat: trade.narrativeHeat,
    breakout_state: trade.tokenHigherTfStructure ?? trade.breakoutState ?? "Ranging",
    reclaim_status: trade.tokenMidTfStructure ?? trade.reclaimStatus ?? "Ranging",
    htf_location: trade.htfLocation ?? null,
    lower_tf_entry_structure: trade.tokenLowerTfStructure ?? trade.lowerTfEntryStructure ?? "Ranging",
    volume_state: trade.volumeState,
    relative_volume: trade.relativeVolume,
    post_breakout_behavior: trade.postBreakoutBehavior,
    entry_price: trade.entryPrice ?? null,
    stop_loss_price: trade.stopLossPrice ?? null,
    tp1_price: trade.tp1Price ?? null,
    tp2_price: trade.tp2Price ?? null,
    tp3_price: trade.tp3Price ?? null,
    tp1_position_pct: trade.tp1PositionPct ?? null,
    tp2_position_pct: trade.tp2PositionPct ?? null,
    tp3_position_pct: trade.tp3PositionPct ?? null,
    entry_location: trade.entryLocation,
    liquidity_stability: trade.liquidityStability,
    move_sl_rule: trade.moveSlRule,
    invalidation_type: trade.invalidationType,
    notes: trade.notes ?? "",
    mode: "trade",
    outcome: trade.outcome ?? null,
    actual_pnl_pct: actualPnlPct,
    mistake_tags: textArray(trade.mistakeTags) ?? null,
    mistake_note: trade.mistakeNote ?? null,
    close_notes: trade.closeNotes ?? null,
    management_notes: trade.managementNotes ?? null,
    execution_analysis: trade.executionAnalysis ?? null,
    status: trade.outcome ? "closed" : "open",
    closed_at: trade.closedAt ?? null,
    final_score: trade.finalScore,
    trade_status: trade.tradeStatus,
    suggested_allocation_pct: trade.suggestedAllocationPct,
    suggested_sl_pct: trade.suggestedSlPct,
    suggested_tp_structure: trade.suggestedTpStructure,
    suggested_rr: trade.suggestedRr,
    trade_warnings: Array.isArray(trade.warnings) ? trade.warnings.join("\n") : "",
    calculated_risk: Number(trade.suggestedAllocationPct ?? 0) * Number(trade.suggestedSlPct ?? 0),
    expected_profit_pct: trade.tp2Pct ?? 0,
    expected_loss_pct: -Number(trade.stopLossPct ?? 0),
    final_decision: trade.finalDecision,
    score_breakdown: {
      ...(typeof trade.scoreBreakdown === "object" && trade.scoreBreakdown != null ? trade.scoreBreakdown : {}),
      ...(typeof trade.presentation === "object" && trade.presentation != null ? { presentation: trade.presentation } : {}),
      scoredAt: trade.scoredAt ?? null,
    },
    risk_per_trade_pct: toFiniteNumber(trade.riskPerTradePct) ?? null,
    risk_amount_usd: toFiniteNumber(trade.riskAmountUsd) ?? null,
    calculated_position_size_usd: toFiniteNumber(trade.calculatedPositionSizeUsd) ?? toFiniteNumber(trade.allocatedAmountUsd) ?? null,
    allocated_capital_pct: toFiniteNumber(trade.allocatedCapitalPct) ?? null,
    created_at: trade.createdAt ?? new Date().toISOString(),
    allocated_amount_usd: toFiniteNumber(trade.allocatedAmountUsd) ?? null,
    realized_pnl_usd: calculateRealizedPnlUsd(toFiniteNumber(trade.allocatedAmountUsd), actualPnlPct),
  };
}

function toTradeUpdate(patch: JsonRow) {
  const update: JsonRow = {};
  if ("outcome" in patch) {
    update.outcome = patch.outcome ?? null;
    update.status = patch.outcome ? "closed" : "open";
    update.closed_at = patch.outcome ? patch.closedAt ?? new Date().toISOString() : null;
  }
  if ("actualPnlPct" in patch) update.actual_pnl_pct = signedPnlPct(patch.outcome, patch.actualPnlPct);
  if ("allocatedAmountUsd" in patch) update.allocated_amount_usd = toFiniteNumber(patch.allocatedAmountUsd) ?? null;
  if ("mistakeTags" in patch) update.mistake_tags = textArray(patch.mistakeTags) ?? null;
  if ("mistakeNote" in patch) update.mistake_note = patch.mistakeNote ?? null;
  if ("closeNotes" in patch) update.close_notes = patch.closeNotes ?? null;
  if ("managementNotes" in patch) update.management_notes = patch.managementNotes ?? null;
  if ("executionAnalysis" in patch) update.execution_analysis = patch.executionAnalysis ?? null;
  if ("notes" in patch) update.notes = patch.notes ?? "";
  return update;
}

function toWatchlist(row: JsonRow) {
  return {
    ...toTrade(row),
    outcome: typeof row.outcome === "string" ? row.outcome : undefined,
    notes: String(row.notes ?? ""),
  };
}

function toWatchlistInsert(item: JsonRow) {
  const {
    mode: _mode,
    status: _status,
    actual_pnl_pct: _actualPnlPct,
    mistake_tags: _mistakeTags,
    mistake_note: _mistakeNote,
    close_notes: _closeNotes,
    management_notes: _managementNotes,
    execution_analysis: _executionAnalysis,
    calculated_risk: _calculatedRisk,
    expected_profit_pct: _expectedProfitPct,
    expected_loss_pct: _expectedLossPct,
    closed_at: _closedAt,
    allocated_amount_usd: _allocatedAmountUsd,
    realized_pnl_usd: _realizedPnlUsd,
    ...row
  } = toTradeInsert(item);

  return {
    ...row,
    outcome: item.outcome ?? null,
    notes: item.notes ?? "",
  };
}

function toWatchlistUpdate(patch: JsonRow) {
  const update: JsonRow = {};
  if ("outcome" in patch) update.outcome = patch.outcome ?? null;
  if ("notes" in patch) update.notes = patch.notes ?? "";
  return update;
}

function toCapitalAdjustment(row: JsonRow) {
  return {
    id: String(row.id),
    adjustmentType: row.adjustment_type === "withdraw" ? "withdraw" : "add",
    amountUsd: Number(row.amount_usd ?? 0),
    note: typeof row.note === "string" ? row.note : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getPath(context: RouteContext) {
  const params = await context.params;
  return params.resource ?? [];
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const [resource] = await getPath(context);
  const supabase = createSupabaseServiceRoleClient();

  if (resource === "trades") {
    const { data, error } = await supabase.from("trades").select("*").order("created_at", { ascending: false });
    if (error) return errorResponse(error.message, 500);
    return NextResponse.json((data ?? []).map(toTrade));
  }

  if (resource === "watchlist") {
    const { data, error } = await supabase.from("watchlist").select("*").order("created_at", { ascending: false });
    if (error) return errorResponse(error.message, 500);
    return NextResponse.json((data ?? []).map(toWatchlist));
  }

  if (resource === "settings") {
    const { data, error } = await supabase.from("settings").select("total_capital").limit(1).maybeSingle();
    if (error) return errorResponse(error.message, 500);
    return NextResponse.json({ totalCapital: Number(data?.total_capital ?? 10000) });
  }

  if (resource === "capital-adjustments") {
    const { data, error } = await supabase.from("capital_adjustments").select("*").order("created_at", { ascending: false });
    if (error) return errorResponse(error.message, 500);
    return NextResponse.json((data ?? []).map(toCapitalAdjustment));
  }

  return errorResponse("Unknown trade data resource.", 404);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const [resource] = await getPath(context);
  const body = (await request.json()) as JsonRow;
  const supabase = createSupabaseServiceRoleClient();

  if (resource === "trades") {
    const { data, error } = await supabase.from("trades").insert(toTradeInsert(body)).select("*").single();
    if (error) return errorResponse(error.message, 500);
    return NextResponse.json(toTrade(data), { status: 201 });
  }

  if (resource === "watchlist") {
    const { data, error } = await supabase.from("watchlist").insert(toWatchlistInsert(body)).select("*").single();
    if (error) return errorResponse(error.message, 500);
    return NextResponse.json(toWatchlist(data), { status: 201 });
  }

  if (resource === "capital-adjustments") {
    const amountUsd = toFiniteNumber(body.amountUsd);
    const adjustmentType = body.adjustmentType === "withdraw" ? "withdraw" : "add";
    if (amountUsd == null || amountUsd <= 0) return errorResponse("Positive amountUsd is required.");

    const { data, error } = await supabase
      .from("capital_adjustments")
      .insert({
        adjustment_type: adjustmentType,
        amount_usd: amountUsd,
        note: body.note ?? null,
        created_at: body.createdAt ?? new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) return errorResponse(error.message, 500);

    return NextResponse.json(toCapitalAdjustment(data), { status: 201 });
  }

  return errorResponse("Unknown trade data resource.", 404);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const [resource, id] = await getPath(context);
  const body = (await request.json()) as JsonRow;
  const numericId = Number(id);
  const supabase = createSupabaseServiceRoleClient();

  if (!Number.isFinite(numericId)) return errorResponse("A numeric id is required.");

  if (resource === "trades") {
    const previousTradeResult = await supabase
      .from("trades")
      .select("id,allocated_amount_usd,actual_pnl_pct,realized_pnl_usd,outcome")
      .eq("id", numericId)
      .single();
    if (previousTradeResult.error) return errorResponse(previousTradeResult.error.message, 500);
    const previousTrade = previousTradeResult.data;

    const tradePatch = toTradeUpdate(body);
    const effectiveOutcome = "outcome" in body ? body.outcome : previousTrade?.outcome;
    const effectiveAllocatedAmountUsd = "allocatedAmountUsd" in body
      ? toFiniteNumber(body.allocatedAmountUsd)
      : toFiniteNumber(previousTrade?.allocated_amount_usd);
    const effectivePnlPct = "actualPnlPct" in body
      ? signedPnlPct(effectiveOutcome, body.actualPnlPct)
      : toFiniteNumber(previousTrade?.actual_pnl_pct);
    if ("allocatedAmountUsd" in body || "actualPnlPct" in body || "outcome" in body) {
      if ("outcome" in body && !body.outcome) {
        tradePatch.realized_pnl_usd = null;
      } else {
        tradePatch.actual_pnl_pct = effectivePnlPct;
        tradePatch.realized_pnl_usd = calculateRealizedPnlUsd(effectiveAllocatedAmountUsd, effectivePnlPct);
      }
    }

    const { data, error } = await supabase
      .from("trades")
      .update(tradePatch)
      .eq("id", numericId)
      .select("*")
      .single();
    if (error) return errorResponse(error.message, 500);

    return NextResponse.json(toTrade(data));
  }

  if (resource === "watchlist") {
    const { data, error } = await supabase
      .from("watchlist")
      .update(toWatchlistUpdate(body))
      .eq("id", numericId)
      .select("*")
      .single();
    if (error) return errorResponse(error.message, 500);
    return NextResponse.json(toWatchlist(data));
  }

  return errorResponse("Unknown trade data resource.", 404);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const [resource] = await getPath(context);
  const body = (await request.json()) as JsonRow;
  const supabase = createSupabaseServiceRoleClient();

  if (resource !== "settings") return errorResponse("Unknown trade data resource.", 404);

  const { data, error } = await supabase
    .from("settings")
    .upsert({ id: 1, total_capital: body.totalCapital ?? 10000 }, { onConflict: "id" })
    .select("total_capital")
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ totalCapital: Number(data?.total_capital ?? body.totalCapital ?? 10000) });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const [resource, id] = await getPath(context);
  const numericId = Number(id);
  const supabase = createSupabaseServiceRoleClient();

  if (!Number.isFinite(numericId)) return errorResponse("A numeric id is required.");

  if (resource === "trades") {
    const { error } = await supabase.from("trades").delete().eq("id", numericId);
    if (error) return errorResponse(error.message, 500);
    return new NextResponse(null, { status: 204 });
  }

  if (resource === "watchlist") {
    const { error } = await supabase.from("watchlist").delete().eq("id", numericId);
    if (error) return errorResponse(error.message, 500);
    return new NextResponse(null, { status: 204 });
  }

  if (resource === "capital-adjustments") {
    const { error: deleteError } = await supabase.from("capital_adjustments").delete().eq("id", numericId);
    if (deleteError) return errorResponse(deleteError.message, 500);

    return new NextResponse(null, { status: 204 });
  }

  return errorResponse("Unknown trade data resource.", 404);
}
