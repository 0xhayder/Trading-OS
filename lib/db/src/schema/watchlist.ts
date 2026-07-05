import { jsonb, pgTable, real, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const watchlistTable = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  coin: text("coin").notNull(),
  setupType: text("setup_type").notNull(),
  timeframe: text("timeframe").notNull(),
  btcCondition: text("btc_condition").notNull().default("Neutral"),
  altCondition: text("alt_condition").notNull().default("Neutral"),
  narrativeStrength: text("narrative_strength").notNull().default("Active"),
  levelClarity: text("level_clarity").notNull().default("Decent"),
  timeframeAlignment: text("timeframe_alignment").notNull().default("Partially Aligned"),
  retestQuality: text("retest_quality").notNull().default("Acceptable"),
  volumeStrength: text("volume_strength").notNull().default("Normal"),
  candleImpulse: text("candle_impulse").notNull().default("Medium"),
  followThrough: text("follow_through").notNull().default("Slowing"),
  stopLossPct: real("stop_loss_pct").notNull().default(0),
  tp1Pct: real("tp1_pct").notNull().default(0),
  tp2Pct: real("tp2_pct").notNull().default(0),
  entryDistance: text("entry_distance").notNull().default("Acceptable"),
  spaceToResistance: text("space_to_resistance").notNull().default("Decent Space"),
  rrQuality: text("rr_quality").notNull().default("Acceptable"),
  overextension: text("overextension").notNull().default("Calm"),
  eventRisk: text("event_risk").notNull().default("Low"),
  liquidityRisk: text("liquidity_risk").notNull().default("Acceptable"),
  notes: text("notes").notNull().default(""),
  outcome: text("outcome"),
  finalScore: real("final_score").notNull().default(0),
  tradeStatus: text("trade_status").notNull().default("Watchlist"),
  suggestedAllocationPct: real("suggested_allocation_pct").notNull().default(0),
  suggestedSlPct: real("suggested_sl_pct").notNull().default(0),
  suggestedTpStructure: text("suggested_tp_structure").notNull().default(""),
  suggestedRr: real("suggested_rr").notNull().default(0),
  tradeWarnings: text("trade_warnings").notNull().default(""),
  finalDecision: text("final_decision").notNull().default(""),
  scoreBreakdown: jsonb("score_breakdown").$type<Record<string, unknown>>(),
  riskPerTradePct: real("risk_per_trade_pct"),
  riskAmountUsd: real("risk_amount_usd"),
  calculatedPositionSizeUsd: real("calculated_position_size_usd"),
  allocatedCapitalPct: real("allocated_capital_pct"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWatchlistSchema = createInsertSchema(watchlistTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type WatchlistItem = typeof watchlistTable.$inferSelect;
