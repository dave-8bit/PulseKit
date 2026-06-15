import type { Request, Response } from "express";

import type { CoreEvent } from "../types/event.types";
import { CoreEventValidator } from "../validation/event.schema";

// POST handler for analytics ingestion.
export const ingestEvent = (req: Request, res: Response): void => {
  // Do not trust untrusted client input; validate at the boundary.
  try {
    const parsedEvent = CoreEventValidator.parse(req.body) as CoreEvent;

    res.status(200).json({
      success: true,
      event: parsedEvent,
    });
  } catch {
    res.status(400).json({
      success: false,
      error: "Invalid event payload",
    });
  }
};

