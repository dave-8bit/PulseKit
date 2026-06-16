import type { Request, Response } from "express";

import { prisma } from "../prisma/client";
import type { CoreEvent } from "../types/event.types";
import { CoreEventValidator } from "../validation/event.schema";
import { toPrismaEvent } from "../mappers/event.mapper";

// POST handler for analytics ingestion.
export const ingestEvent = async (req: Request, res: Response): Promise<void> => {
  // Do not trust untrusted client input; validate at the boundary.
  try {
    const parsedEvent = CoreEventValidator.parse(req.body) as CoreEvent;

    const apiToken = (req.body as { api_token?: unknown }).api_token;
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { api_token: apiToken },
      select: { id: true },
    });

    if (!workspace) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    // SECURITY: never trust client-provided workspace_id.
    // Workspace id is derived only from a validated api_token.
    const workspaceId = workspace.id;

    const prismaEventInput = toPrismaEvent({
      event_id: parsedEvent.event_id,
      event_type: parsedEvent.event_type,
      timestamp: parsedEvent.timestamp,
      url: parsedEvent.url,
      user_agent: parsedEvent.user_agent,
      properties: parsedEvent.properties,
      workspace_id: workspaceId,
    });


    // Idempotency: prevent duplicates using the DB unique constraint
    // on (workspace_id, event_id).
    const existingEvent = await prisma.event.findUnique({
      where: {
        workspace_id_event_id: {
          workspace_id: workspaceId,
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
      data: prismaEventInput,
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

