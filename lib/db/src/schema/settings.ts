import { pgTable, serial, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  totalCapital: real("total_capital").notNull().default(10000),
  riskProfilePct: real("risk_profile_pct").notNull().default(1.5),
  defaultRiskPct: real("default_risk_pct").notNull().default(1),
  maxAllocationPct: real("max_allocation_pct").notNull().default(5),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
});
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
