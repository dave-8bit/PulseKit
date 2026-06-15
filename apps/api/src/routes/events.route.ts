import { Router } from "express";

import { ingestEvent } from "../controllers/events.controller";

export const eventsRouter = Router();

// POST /events - validate and return the parsed CoreEvent.
eventsRouter.post("/", ingestEvent);

