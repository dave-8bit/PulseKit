import type { Request, Response } from "express";

import { findWorkspaceByApiToken } from "../services/workspace.service";
import {
  getEventsByType,
  getEventsOverTime,
  getTopPages,
  getTotalPageViews,
} from "../services/analytics.service";
import {
  analyticsCommonQuerySchema,
  eventsOverTimeQuerySchema,
} from "../validation/analytics.schema";
import { ZodError } from "zod";
import { subscribe } from "../services/realtime.service";

type AnalyticsFilter = {
  workspaceId: string;
  start?: Date;
  end?: Date;
};

function toAnalyticsFilter(apiToken: string, parsedQuery: unknown): Promise<AnalyticsFilter> {
  // This function keeps controller logic readable while ensuring
  // workspace lookup happens before building the filter.
  return (async () => {
    const workspace = await findWorkspaceByApiToken(apiToken);
    if (!workspace) {
      // Controller expects 401 for invalid token.
      throw new Error("WORKSPACE_NOT_FOUND");
    }

    const base = parsedQuery as {
      start?: Date;
      end?: Date;
    };

    return {
      workspaceId: workspace.id,
      start: base.start,
      end: base.end,
    };
  })();
}

export async function getTotalPageViewsController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const apiToken = req.apiToken;
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const parsed = analyticsCommonQuerySchema.parse(req.query);
    const filter = await toAnalyticsFilter(apiToken, parsed);

    const total = await getTotalPageViews(filter);

    res.status(200).json({ success: true, data: { totalPageViews: total } });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: "Invalid query" });
      return;
    }

    if (err instanceof Error && err.message === "WORKSPACE_NOT_FOUND") {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    console.error(err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

/**
 * SSE endpoint: GET /analytics/realtime
 *
 * Registers the client with the in-memory realtime pub/sub service and
 * keeps the connection open so the service can push event notifications.
 *
 * Headers follow SSE best practices:
 *  - Content-Type:   text/event-stream
 *  - Cache-Control:  no-cache, no-transform
 *  - Connection:     keep-alive
 *
 * An initial "connected" event is sent immediately so the client knows
 * the stream is established without waiting for the first analytics event.
 */
export async function realtimeSSEController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const apiToken = req.apiToken;
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const workspace = await findWorkspaceByApiToken(apiToken);
    if (!workspace) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    // ---- SSE headers ----
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    // Flush headers immediately so the client receives them right away.
    res.flushHeaders();

    // Send an initial "connected" event to confirm the stream is live.
    res.write(`event: connected\ndata: {}\n\n`);

    // Register the client with the realtime service.
    // subscribe() attaches a one‑shot `close` listener that automatically
    // removes the Response from the subscriber registry when the client
    // disconnects — no manual cleanup needed here.
    subscribe(workspace.id, res);

    // Intentionally do NOT call res.end() — the connection stays open.
    // The `close` event handled inside subscribe() handles cleanup.
  } catch (err: unknown) {
    console.error("realtimeSSEController error:", err);

    // If headers haven't been sent yet, respond with 500 JSON.
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Internal Server Error" });
    } else {
      // Headers already flushed — try to end the stream gracefully.
      res.end();
    }
  }
}

export async function getEventsByTypeController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const apiToken = req.apiToken;
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const parsed = analyticsCommonQuerySchema.parse(req.query);
    const filter = await toAnalyticsFilter(apiToken, parsed);

    const eventsByType = await getEventsByType(filter);

    res.status(200).json({ success: true, data: eventsByType });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: "Invalid query" });
      return;
    }

    if (err instanceof Error && err.message === "WORKSPACE_NOT_FOUND") {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    console.error(err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

export async function getTopPagesController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const apiToken = req.apiToken;
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const parsed = analyticsCommonQuerySchema.parse(req.query);

    const limit = parsed.limit ?? 10;
    const filter = await toAnalyticsFilter(apiToken, parsed);

    const topPages = await getTopPages(filter, limit);

    res.status(200).json({ success: true, data: topPages });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: "Invalid query" });
      return;
    }

    if (err instanceof Error && err.message === "WORKSPACE_NOT_FOUND") {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    console.error(err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

export async function getEventsOverTimeController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const apiToken = req.apiToken;
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const parsed = eventsOverTimeQuerySchema.parse(req.query);
    const { granularity, ...rest } = parsed;

    const filter = await toAnalyticsFilter(apiToken, rest);

    const series = await getEventsOverTime(filter, granularity);

    res.status(200).json({ success: true, data: series });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: "Invalid query" });
      return;
    }

    if (err instanceof Error && err.message === "WORKSPACE_NOT_FOUND") {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    console.error(err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

