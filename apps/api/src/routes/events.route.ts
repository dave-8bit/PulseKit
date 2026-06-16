import { Router } from "express";

import { ingestEvent } from "../controllers/events.controller";
import { validateApiToken } from "../middleware/api-token.middleware";

export const eventsRouter = Router();

// POST /events
//
// Middleware order matters:
// 1) validateApiToken runs first to ensure the request has a valid API token.
// 2) ingestEvent (controller) can then focus purely on event validation,
//    mapping, idempotency, and persistence.
eventsRouter.post("/", validateApiToken, ingestEvent);


