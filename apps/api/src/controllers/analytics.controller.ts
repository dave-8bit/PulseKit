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

