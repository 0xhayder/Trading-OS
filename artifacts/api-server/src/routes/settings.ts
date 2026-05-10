import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody, GetSettingsResponse, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);

  if (!settings) {
    [settings] = await db
      .insert(settingsTable)
      .values({
        totalCapital: 10000,
        riskProfilePct: 1.5,
        defaultRiskPct: 1,
        maxAllocationPct: 5,
      })
      .returning();
  }

  res.json(GetSettingsResponse.parse(settings));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let [settings] = await db.select().from(settingsTable).limit(1);

  if (!settings) {
    [settings] = await db
      .insert(settingsTable)
      .values({
        totalCapital: 10000,
        riskProfilePct: 1.5,
        defaultRiskPct: 1,
        maxAllocationPct: 5,
        ...parsed.data,
      })
      .returning();
  } else {
    [settings] = await db
      .update(settingsTable)
      .set(parsed.data)
      .returning();
  }

  res.json(UpdateSettingsResponse.parse(settings));
});

export default router;
