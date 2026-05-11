import { Router, type IRouter } from "express";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { db, tradesTable } from "@workspace/db";
import {
  ListTradesQueryParams,
  CreateTradeBody,
  GetTradeParams,
  UpdateTradeParams,
  UpdateTradeBody,
  DeleteTradeParams,
  ScoreTradeBody,
  GetTradeResponse,
  ListTradesResponse,
  UpdateTradeResponse,
  ScoreTradeResponse,
} from "@workspace/api-zod";
import { evaluateTradeInput, scoreTradeInput } from "../lib/scorer";

const router: IRouter = Router();

router.post("/trades/score", async (req, res): Promise<void> => {
  const parsed = ScoreTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const settings = await db.query.settingsTable.findFirst();
  const score = scoreTradeInput(parsed.data, {
    baseAccountEquity: settings?.totalCapital ?? 10_000,
    maxSinglePositionPct: settings?.maxAllocationPct ?? 25,
  });
  res.json(ScoreTradeResponse.parse(score));
});

router.get("/trades", async (req, res): Promise<void> => {
  const params = ListTradesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.status) conditions.push(eq(tradesTable.status, params.data.status));
  if (params.data.setupType) conditions.push(eq(tradesTable.setupType, params.data.setupType));
  if (params.data.outcome) conditions.push(eq(tradesTable.outcome, params.data.outcome));
  if (params.data.coin) conditions.push(like(tradesTable.coin, `%${params.data.coin}%`));

  const query = db
    .select()
    .from(tradesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tradesTable.createdAt))
    .limit(params.data.limit ?? 100)
    .offset(params.data.offset ?? 0);

  const trades = await query;
  res.json(ListTradesResponse.parse(trades));
});

router.post("/trades", async (req, res): Promise<void> => {
  const parsed = CreateTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settings = await db.query.settingsTable.findFirst();
  const { tradeScore: score, persistence } = evaluateTradeInput(parsed.data, {
    baseAccountEquity: settings?.totalCapital ?? 10_000,
    maxSinglePositionPct: settings?.maxAllocationPct ?? 25,
  });

  const [trade] = await db
    .insert(tradesTable)
    .values({
      ...parsed.data,
      mode: parsed.data.mode ?? "trade",
      ...score,
      tradeClassification: persistence.tradeClassification,
      engineVersion: persistence.engineVersion,
      scoreBreakdown: persistence.scoreBreakdown as Record<string, unknown>,
      wasRejectedByEngine: persistence.wasRejectedByEngine,
    })
    .returning();

  res.status(201).json(GetTradeResponse.parse(trade));
});

router.get("/trades/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetTradeParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [trade] = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.id, params.data.id));

  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  res.json(GetTradeResponse.parse(trade));
});

router.patch("/trades/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateTradeParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, ...nullablePatch } = parsed.data;
  const updatePatch = {
    ...nullablePatch,
    ...(status == null ? {} : { status }),
  };

  const [trade] = await db
    .update(tradesTable)
    .set(updatePatch)
    .where(eq(tradesTable.id, params.data.id))
    .returning();

  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  res.json(UpdateTradeResponse.parse(trade));
});

router.delete("/trades/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteTradeParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [trade] = await db
    .delete(tradesTable)
    .where(eq(tradesTable.id, params.data.id))
    .returning();

  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const settings = await db.query.settingsTable.findFirst();
  const totalCapital = settings?.totalCapital ?? 10000;

  const allTrades = await db
    .select()
    .from(tradesTable)
    .orderBy(desc(tradesTable.createdAt));

  const closed = allTrades.filter((t) => t.outcome && t.actualPnlPct != null);
  const wins = closed.filter((t) => (t.actualPnlPct ?? 0) > 0);
  const losses = closed.filter((t) => (t.actualPnlPct ?? 0) <= 0);

  const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 1000) / 10 : 0;

  const avgRr = closed.length > 0
    ? Math.round((closed.reduce((s, t) => s + (t.suggestedRr ?? 0), 0) / closed.length) * 10) / 10
    : 0;

  const totalPnlPct = closed.reduce((s, t) => s + (t.actualPnlPct ?? 0), 0);
  const openTradesCount = allTrades.filter((t) => t.status === "open").length;
  const recentTrades = allTrades.slice(0, 10);

  res.json({
    totalCapital,
    totalPnlPct: Math.round(totalPnlPct * 100) / 100,
    winRate,
    avgRr,
    tradeCount: allTrades.length,
    openTradesCount,
    winCount: wins.length,
    lossCount: losses.length,
    recentTrades,
  });
});

router.get("/analytics/equity-curve", async (_req, res): Promise<void> => {
  const trades = await db
    .select()
    .from(tradesTable)
    .where(sql`${tradesTable.actualPnlPct} IS NOT NULL`)
    .orderBy(tradesTable.createdAt);

  let equity = 100;
  const curve = trades.map((t) => {
    equity += t.actualPnlPct ?? 0;
    return {
      date: t.createdAt.toISOString().split("T")[0],
      equity: Math.round(equity * 100) / 100,
      tradeId: t.id,
    };
  });

  res.json(curve);
});

router.get("/analytics/by-setup", async (_req, res): Promise<void> => {
  const trades = await db
    .select()
    .from(tradesTable)
    .where(sql`${tradesTable.actualPnlPct} IS NOT NULL`);

  const bySetup: Record<string, { wins: number; total: number; pnl: number; scoreSum: number }> = {};

  for (const t of trades) {
    const key = t.setupType;
    if (!bySetup[key]) bySetup[key] = { wins: 0, total: 0, pnl: 0, scoreSum: 0 };
    bySetup[key].total++;
    bySetup[key].pnl += t.actualPnlPct ?? 0;
    bySetup[key].scoreSum += t.finalScore;
    if ((t.actualPnlPct ?? 0) > 0) bySetup[key].wins++;
  }

  const result = Object.entries(bySetup).map(([setupType, data]) => ({
    setupType,
    tradeCount: data.total,
    winRate: Math.round((data.wins / data.total) * 1000) / 10,
    totalPnlPct: Math.round(data.pnl * 100) / 100,
    avgScore: Math.round((data.scoreSum / data.total) * 10) / 10,
  }));

  res.json(result);
});

router.get("/analytics/by-coin", async (_req, res): Promise<void> => {
  const trades = await db
    .select()
    .from(tradesTable)
    .where(sql`${tradesTable.actualPnlPct} IS NOT NULL`);

  const byCoin: Record<string, { wins: number; total: number; pnl: number }> = {};

  for (const t of trades) {
    const key = t.coin;
    if (!byCoin[key]) byCoin[key] = { wins: 0, total: 0, pnl: 0 };
    byCoin[key].total++;
    byCoin[key].pnl += t.actualPnlPct ?? 0;
    if ((t.actualPnlPct ?? 0) > 0) byCoin[key].wins++;
  }

  const result = Object.entries(byCoin).map(([coin, data]) => ({
    coin,
    tradeCount: data.total,
    winRate: Math.round((data.wins / data.total) * 1000) / 10,
    totalPnlPct: Math.round(data.pnl * 100) / 100,
  }));

  res.json(result);
});

router.get("/analytics/mistakes", async (_req, res): Promise<void> => {
  const trades = await db
    .select({ mistakeTags: tradesTable.mistakeTags })
    .from(tradesTable)
    .where(sql`${tradesTable.mistakeTags} IS NOT NULL`);

  const freq: Record<string, number> = {};
  for (const t of trades) {
    if (!t.mistakeTags) continue;
    for (const tag of t.mistakeTags.split(",").map((s) => s.trim())) {
      if (tag) freq[tag] = (freq[tag] ?? 0) + 1;
    }
  }

  const result = Object.entries(freq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  res.json(result);
});

export default router;
