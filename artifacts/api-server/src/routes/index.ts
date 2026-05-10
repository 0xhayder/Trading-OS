import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradesRouter from "./trades";
import watchlistRouter from "./watchlist";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tradesRouter);
router.use(watchlistRouter);
router.use(settingsRouter);

export default router;
