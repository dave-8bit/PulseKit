import type { Request, Response } from "express";

import { prisma } from "../prisma/client";
import type { CoreEvent } from "../types/event.types";
import { CoreEventValidator } from "../validation/event.schema";

// POST handler for analytics ingestion.
export const ingestEvent = async (req: Request, res: Response): Promise<void> => {
  // Do not trust untrusted client input; validate at the boundary.
  try {
    const parsedEvent = CoreEventValidator.parse(req.body) as CoreEvent;

    // Idempotency: prevent duplicates using the DB unique constraint
    // on (workspace_id, event_id).
    const existingEvent = await prisma.event.findUnique({
      where: {
        workspace_id_event_id: {
          workspace_id: parsedEvent.workspace_id,
          event_id: parsedEvent.event_id,
        },
      },
    });

    if (existingEvent) {
      res.status(200).json({
        success: true,
        event: existingEvent,
      });
      return;
    }

    const storedEvent = await prisma.event.create({
      data: {
        event_id: parsedEvent.event_id,
        workspace_id: parsedEvent.workspace_id,
        event_type: parsedEvent.event_type,
        timestamp: new Date(parsedEvent.timestamp),
        url: parsedEvent.url,
        user_agent: parsedEvent.user_agent,
        properties: parsedEvent.properties,
      },
    });


    res.status(200).json({
      success: true,
      event: storedEvent,
    });
  } catch {
    res.status(400).json({
      success: false,
      error: "Invalid event payload",
    });
  }
};


