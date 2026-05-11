import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type JsonRow = Record<string, unknown>;
type RouteContext = { params: Promise<{ resource?: string[] }> };

function toFiniteNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function calculateRealizedPnlUsd(allocatedAmountUsd: number | undefined, pnlPct: number | undefined): number | null {
  if (allocatedAmountUsd == null || pnlPct == null) return null;
  const realized = allocatedAmountUsd * (pnlPct / 100);
  return Math.round(realized * 100) / 100;
}

function splitWarnings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || value.trim() === "") return [];
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function toTrade(row: JsonRow) {
  return {
    id: String(row.id),
    coin: String(row.coin ?? ""),
    setupType: String(row.setup_type ?? "Breakout Retest"),
    timeframe: String(row.timeframe ?? "Daily"),
    btcCondition: String(row.btc_condition ?? "Neutral"),
    altCondition: String(row.alt_condition ?? "Neutral"),
    narrativeStrength: String(row.narrative_strength ?? "Active"),
    levelClarity: String(row.level_clarity ?? "Decent"),
    timeframeAlignment: String(row.timeframe_alignment ?? "Partially Aligned"),
    retestQuality: String(row.retest_quality ?? "Acceptable"),
    volumeStrength: String(row.volume_strength ?? "Normal"),
    candleImpulse: String(row.candle_impulse ?? "Medium"),
    followThrough: String(row.follow_through ?? "Slowing"),
    stopLossPct: Number(row.stop_loss_pct ?? 0),
    tp1Pct: Number(row.tp1_pct ?? 0),
    tp2Pct: Number(row.tp2_pct ?? 0),
    entryDistance: String(row.entry_distance ?? "Acceptable"),
    spaceToResistance: String(row.space_to_resistance ?? "Decent Space"),
    rrQuality: String(row.rr_quality ?? "Acceptable"),
    overextension: String(row.overextension ?? "Calm"),
    eventRisk: String(row.event_risk ?? "Low"),
    liquidityRisk: String(row.liquidity_risk ?? "Acceptable"),
    notes: String(row.notes ?? ""),
    finalScore: Number(row.final_score ?? 0),
    tradeStatus: String(row.trade_status ?? "Reject Trade"),
    suggestedAllocationPct: Number(row.suggested_allocation_pct ?? 0),
    suggestedSlPct: Number(row.suggested_sl_pct ?? 0),
    suggestedTpStructure: String(row.suggested_tp_structure ?? ""),
    suggestedRr: Number(row.suggested_rr ?? 0),
    warnings: splitWarnings(row.trade_warnings),
    finalDecision: String(row.final_decision ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    allocatedAmountUsd: row.allocated_amount_usd == null ? undefined : Number(row.allocated_amount_usd),
    realizedPnlUsd: row.realized_pnl_usd == null ? undefined : Number(row.realized_pnl_usd),
    outcome: typeof row.outcome === "string" ? row.outcome : undefined,
    actualPnlPct: row.actual_pnl_pct == null ? undefined : Number(row.actual_pnl_pct),
    mistakeTags: typeof row.mistake_tags === "string" ? row.mistake_tags : undefined,
  };
}

function toTradeInsert(trade: JsonRow) {
  return {
    coin: trade.coin,
    setup_type: trade.setupType,
    timeframe: trade.timeframe,
    btc_condition: trade.btcCondition,
    alt_condition: trade.altCondition,
    narrative_strength: trade.narrativeStrength,
    level_clarity: trade.levelClarity,
    timeframe_alignment: trade.timeframeAlignment,
    retest_quality: trade.retestQuality,
    volume_strength: trade.volumeStrength,
    candle_impulse: trade.candleImpulse,
    follow_through: trade.followThrough,
    stop_loss_pct: trade.stopLossPct,
    tp1_pct: trade.tp1Pct,
    tp2_pct: trade.tp2Pct,
    entry_distance: trade.entryDistance,
    space_to_resistance: trade.spaceToResistance,
    rr_quality: trade.rrQuality,
    overextension: trade.overextension,
    event_risk: trade.eventRisk,
    liquidity_risk: trade.liquidityRisk,
    notes: trade.notes ?? "",
    mode: "trade",
    outcome: trade.outcome ?? null,
    actual_pnl_pct: trade.actualPnlPct ?? null,
    mistake_tags: trade.mistakeTags ?? null,
    status: trade.outcome ? "closed" : "open",
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
    created_at: trade.createdAt ?? new Date().toISOString(),
    allocated_amount_usd: toFiniteNumber(trade.allocatedAmountUsd) ?? null,
    realized_pnl_usd: calculateRealizedPnlUsd(
      toFiniteNumber(trade.allocatedAmountUsd),
      toFiniteNumber(trade.actualPnlPct),
    ),
  };
}

function toTradeUpdate(patch: JsonRow) {
  const update: JsonRow = {};
  if ("outcome" in patch) {
    update.outcome = patch.outcome ?? null;
    update.status = patch.outcome ? "closed" : "open";
  }
  if ("actualPnlPct" in patch) update.actual_pnl_pct = patch.actualPnlPct ?? null;
  if ("allocatedAmountUsd" in patch) update.allocated_amount_usd = toFiniteNumber(patch.allocatedAmountUsd) ?? null;
  if ("mistakeTags" in patch) update.mistake_tags = patch.mistakeTags ?? null;
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
    calculated_risk: _calculatedRisk,
    expected_profit_pct: _expectedProfitPct,
    expected_loss_pct: _expectedLossPct,
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
      .select("id,allocated_amount_usd,actual_pnl_pct,realized_pnl_usd")
      .eq("id", numericId)
      .single();
    if (previousTradeResult.error) return errorResponse(previousTradeResult.error.message, 500);
    const previousTrade = previousTradeResult.data;

    const tradePatch = toTradeUpdate(body);
    const effectiveAllocatedAmountUsd = "allocatedAmountUsd" in body
      ? toFiniteNumber(body.allocatedAmountUsd)
      : toFiniteNumber(previousTrade?.allocated_amount_usd);
    const effectivePnlPct = "actualPnlPct" in body
      ? toFiniteNumber(body.actualPnlPct)
      : toFiniteNumber(previousTrade?.actual_pnl_pct);
    if ("allocatedAmountUsd" in body || "actualPnlPct" in body || "outcome" in body) {
      if ("outcome" in body && !body.outcome) {
        tradePatch.realized_pnl_usd = null;
      } else {
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

    const previousRealized = toFiniteNumber(previousTrade?.realized_pnl_usd) ?? 0;
    const nextRealized = toFiniteNumber(data.realized_pnl_usd) ?? 0;
    const capitalDelta = Math.round((nextRealized - previousRealized) * 100) / 100;
    if (capitalDelta !== 0) {
      const settingsResult = await supabase
        .from("settings")
        .select("id,total_capital")
        .eq("id", 1)
        .single();

      if (settingsResult.error) return errorResponse(settingsResult.error.message, 500);
      const currentCapital = Number(settingsResult.data.total_capital ?? 0);
      const nextCapital = Math.round((currentCapital + capitalDelta) * 100) / 100;
      const { error: settingsUpdateError } = await supabase
        .from("settings")
        .update({ total_capital: nextCapital })
        .eq("id", 1);
      if (settingsUpdateError) return errorResponse(settingsUpdateError.message, 500);
    }

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

  return errorResponse("Unknown trade data resource.", 404);
}
