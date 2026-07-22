import type { Request, Response } from "express";

import { ZodError } from "zod";

import { findWorkspaceByApiToken } from "../services/workspace.service";
import { createEvent, findExistingEvent } from "../services/event.service";
import { publish } from "../services/realtime.service";
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
    // The token was validated by validateApiToken middleware.
    const apiToken = (req as Request & { apiToken?: string }).apiToken;

    // Validate the incoming client payload at the boundary.
    // workspace_id is derived from the validated api token (not from the client).
    const parsedClientEvent = CoreEventValidator.parse(req.body);



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
      res.status(403).json({
        success: false,
        error: "Forbidden",
      });
      return;
    }


    // SECURITY:
    // Never trust workspace identifiers from the client.
    // The workspace id is derived only from a validated API token.
    const workspaceId = workspace.id;

    // Idempotency:
    // Prevent duplicates using the DB unique constraint on (workspace_id, event_id).
    //
    // REQUIRED strict order:
    // 1) Duplicate check (MUST happen BEFORE database insert)
    // 2) Transform event
    // 3) Insert event
    const existingEvent = await findExistingEvent(
      workspaceId,
      parsedClientEvent.event_id
    );

    if (existingEvent) {

      res.status(409).json({
        success: false,
        error: "Duplicate event",
      });
      return;
    }

    // Transform event (construct internal persisted event)
    const internalEvent = {
      ...parsedClientEvent,
      workspace_id: workspaceId,
    };

    const prismaEventInput = toPrismaEvent(internalEvent);



    // Insert event
    try {
      const storedEvent = await createEvent(prismaEventInput);
      res.status(200).json({
        success: true,
        event: storedEvent,
      });

      // Fire-and-forget realtime notification (non-blocking).
      // publish() writes SSE‑formatted JSON to connected clients for this
      // workspace.  Errors are isolated per‑client inside publish() and do
      // not affect the HTTP response.
      publish(workspaceId, storedEvent);
    } catch (err: unknown) {
      // Race-condition safe behavior:
      // If two identical requests arrive simultaneously, the second may
      // fail due to the DB unique constraint.
      // Prisma unique constraint violation code is typically `P2002`.
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === "P2002") {
        res.status(409).json({
          success: false,
          error: "Duplicate event",
        });
        return;
      }

      throw err;
    }
  } catch (err) {
    console.error(err);
    console.error(err?.constructor?.name);

    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid event payload",
        issues: err.issues,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: "Invalid event payload",
    });
  }
};



