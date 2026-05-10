import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, watchlistTable } from "@workspace/db";
import {
  CreateWatchlistItemBody,
  UpdateWatchlistItemParams,
  UpdateWatchlistItemBody,
  UpdateWatchlistItemResponse,
  DeleteWatchlistItemParams,
  ListWatchlistResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/watchlist", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(watchlistTable)
    .orderBy(watchlistTable.createdAt);
  res.json(ListWatchlistResponse.parse(items));
});

router.post("/watchlist", async (req, res): Promise<void> => {
  const parsed = CreateWatchlistItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(watchlistTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(item);
});

router.patch("/watchlist/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateWatchlistItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWatchlistItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(watchlistTable)
    .set(parsed.data)
    .where(eq(watchlistTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Watchlist item not found" });
    return;
  }

  res.json(UpdateWatchlistItemResponse.parse(item));
});

router.delete("/watchlist/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteWatchlistItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(watchlistTable)
    .where(eq(watchlistTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Watchlist item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
