import { Router } from "express";

import { bearerTokenMiddleware } from "../middleware/bearer-token.middleware";
import { postAiQueryController } from "../controllers/ai.controller";

export const aiRouter = Router();

aiRouter.post("/query", bearerTokenMiddleware, postAiQueryController);

