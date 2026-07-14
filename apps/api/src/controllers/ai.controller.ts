import type { Request, Response } from "express";

import { aiQueryRequestSchema } from "../schemas/ai.schema";


import { findWorkspaceByApiToken } from "../services/workspace.service";
import { runAiQueryEngine } from "../services/aiQueryEngine.service";

export async function postAiQueryController(req: Request, res: Response) {
  try {
    const apiToken = req.apiToken;
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    // Validate body
    const parsed = aiQueryRequestSchema.parse(req.body);

    const workspace = await findWorkspaceByApiToken(apiToken);
    if (!workspace) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const result = await runAiQueryEngine(parsed, workspace.id);

    res.status(200).json({
      success: true,
      data: {
        answer: result.answer,
        metrics: result.metrics,
      },
    });
  } catch (err: unknown) {
    // Keep error format aligned with existing controllers.
    // analytics controllers use ZodError -> 400, otherwise 500.
    // We avoid leaking internal details.
    // eslint-disable-next-line no-console
    console.error(err);

    // ZodError has a 'issues' property but we don't depend on it here.
    if (err && typeof err === "object" && "issues" in err) {
      res.status(400).json({ success: false, error: "Invalid query" });
      return;
    }

    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

