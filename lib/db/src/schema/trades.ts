import { pgTable, serial, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  coin: text("coin").notNull(),
  setupType: text("setup_type").notNull(),
  timeframe: text("timeframe").notNull(),
  btcCondition: text("btc_condition").notNull(),
  altCondition: text("alt_condition").notNull(),
  narrativeStrength: text("narrative_strength").notNull(),
  levelClarity: text("level_clarity").notNull(),
  timeframeAlignment: text("timeframe_alignment").notNull(),
  retestQuality: text("retest_quality").notNull(),
  volumeStrength: text("volume_strength").notNull(),
  candleImpulse: text("candle_impulse").notNull(),
  followThrough: text("follow_through").notNull(),
  stopLossPct: real("stop_loss_pct").notNull(),
  tp1Pct: real("tp1_pct").notNull(),
  tp2Pct: real("tp2_pct").notNull(),
  entryDistance: text("entry_distance").notNull(),
  spaceToResistance: text("space_to_resistance").notNull(),
  rrQuality: text("rr_quality").notNull(),
  overextension: text("overextension").notNull(),
  eventRisk: text("event_risk").notNull(),
  liquidityRisk: text("liquidity_risk").notNull(),
  notes: text("notes"),
  mode: text("mode").notNull().default("trade"),
  outcome: text("outcome"),
  actualPnlPct: real("actual_pnl_pct"),
  exitPrice: real("exit_price"),
  mistakeTags: text("mistake_tags"),
  status: text("status").notNull().default("open"),
  finalScore: real("final_score").notNull(),
  tradeStatus: text("trade_status").notNull(),
  suggestedAllocationPct: real("suggested_allocation_pct").notNull(),
  suggestedSlPct: real("suggested_sl_pct").notNull(),
  suggestedTpStructure: text("suggested_tp_structure").notNull(),
  suggestedRr: real("suggested_rr").notNull(),
  tradeWarnings: text("trade_warnings").notNull().default(""),
  calculatedRisk: real("calculated_risk").notNull(),
  expectedProfitPct: real("expected_profit_pct").notNull(),
  expectedLossPct: real("expected_loss_pct").notNull(),
  finalDecision: text("final_decision").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
