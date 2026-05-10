import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tradesTable } from "./trades";

/** Optional link to Supabase `auth.users.id` */
export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userOsSettingsTable = pgTable("user_os_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  baseAccountEquity: real("base_account_equity").notNull().default(10000),
  maxSinglePositionPct: real("max_single_position_pct").notNull().default(25),
  factorConfig: jsonb("factor_config").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tradeFactorsTable = pgTable("trade_factors", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => tradesTable.id, { onDelete: "cascade" }),
  layer: text("layer").notNull(),
  factorKey: text("factor_key").notNull(),
  weightInLayer: real("weight_in_layer").notNull(),
  rawScore: real("raw_score").notNull(),
  weightedContribution: real("weighted_contribution").notNull(),
  inputSnapshot: jsonb("input_snapshot").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tradeResultsTable = pgTable("trade_results", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .unique()
    .references(() => tradesTable.id, { onDelete: "cascade" }),
  outcome: text("outcome"),
  pnlPct: real("pnl_pct"),
  pnlAbsolute: real("pnl_absolute"),
  holdDurationHours: real("hold_duration_hours"),
  equityAfter: real("equity_after"),
  maxFavorableExcursionPct: real("max_favorable_excursion_pct"),
  maxAdverseExcursionPct: real("max_adverse_excursion_pct"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tradeScreenshotsTable = pgTable("trade_screenshots", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => tradesTable.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  publicUrl: text("public_url"),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsSnapshotsTable = pgTable("analytics_snapshots", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => profilesTable.id, { onDelete: "set null" }),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
});

export const insertTradeFactorSchema = createInsertSchema(tradeFactorsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTradeFactor = z.infer<typeof insertTradeFactorSchema>;

export const insertTradeResultSchema = createInsertSchema(tradeResultsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTradeResult = z.infer<typeof insertTradeResultSchema>;

export const insertTradeScreenshotSchema = createInsertSchema(tradeScreenshotsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTradeScreenshot = z.infer<typeof insertTradeScreenshotSchema>;
