import { Router } from "express";

import { bearerTokenMiddleware } from "../middleware/bearer-token.middleware";
import {
  getEventsByTypeController,
  getEventsOverTimeController,
  getTopPagesController,
  getTotalPageViewsController,
} from "../controllers/analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/page-views/total",
  bearerTokenMiddleware,
  getTotalPageViewsController
);

analyticsRouter.get(
  "/events-by-type",
  bearerTokenMiddleware,
  getEventsByTypeController
);

analyticsRouter.get(
  "/top-pages",
  bearerTokenMiddleware,
  getTopPagesController
);

analyticsRouter.get(
  "/events-over-time",
  bearerTokenMiddleware,
  getEventsOverTimeController
);

