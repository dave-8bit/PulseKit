import type { Request, Response } from "express";

import { findWorkspaceByApiToken } from "../services/workspace.service";
import { createEvent, findExistingEvent } from "../services/event.service";
import { CoreEventValidator } from "../validation/event.schema";
import { toPrismaEvent } from "../mappers/event.mapper";


/**
 * POST /events controller
 *
 * This controller is responsible for turning an incoming request into
 * a persisted analytics event.
 *
 * Important boundary rules in this codebase:
 * - API token validation happens in middleware (validateApiToken).
 *   That middleware ensures `req.apiToken` exists and is well-formed.
 * - Request-body validation happens here using `CoreEventValidator`.
 * - Database access for “workspace by token” is delegated to a service.
 */
export const ingestEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate the incoming event payload at the boundary.
    // If the payload is invalid, we return 400.
    const parsedEvent = CoreEventValidator.parse(req.body);

    // The token was validated by validateApiToken middleware.
    const apiToken = req.apiToken;

    // Defensive check: keep behavior the same even if middleware is ever
    // mounted incorrectly.
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    // Fetch workspace info based on the validated token.
    //
    // Why this is moved into a service:
    // - Controllers should mainly handle HTTP concerns (request/response).
    // - Database queries (Prisma) belong in a service so the logic is reusable.
    // - Returning only the fields we need (in the service: `select: { id: true }`)
    //   can improve performance and reduces accidental coupling to unused columns.
    const workspace = await findWorkspaceByApiToken(apiToken);

    if (!workspace) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    // SECURITY:
    // Never trust workspace identifiers from the client.
    // The workspace id is derived only from a validated API token.
    const workspaceId = workspace.id;

    const prismaEventInput = toPrismaEvent({
      ...parsedEvent,
      workspace_id: workspaceId,
    });

    // Idempotency:
    // Prevent duplicates using the DB unique constraint on (workspace_id, event_id).
    //
    // The logic for querying/creating events lives in a service so this
    // controller remains focused on HTTP concerns.
    const existingEvent = await findExistingEvent(
      workspaceId,
      parsedEvent.event_id
    );


    if (existingEvent) {
      res.status(200).json({
        success: true,
        event: existingEvent,
      });
      return;
    }

    const storedEvent = await createEvent(prismaEventInput);


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

