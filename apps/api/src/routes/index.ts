import { Router } from "express";

// Central route aggregator.
//
// Why aggregate routes?
// - It keeps the server bootstrap file small.
// - It makes it easy to see which endpoints are registered.
// - It centralizes route wiring in one place.

import { eventsRouter } from "./events.route";
import { healthRouter } from "./health.route";

export const apiRouter = Router();

// Mount /health and /events.
apiRouter.use(healthRouter);
apiRouter.use("/events", eventsRouter);

