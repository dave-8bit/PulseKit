import { createOpenRouterChatCompletion } from "./openrouter.service";

import {
  getEventsByType,
  getEventsOverTime,
  getTopPages,
  getTotalPageViews,
} from "./analytics.service";

import type { AiQueryRequest } from "../types/ai.types";

type AnalyticsFilter = {
  workspaceId: string;
  start?: Date;
  end?: Date;
};

type InternalQueryPlan =
  | {
      kind: "page_views_total";
      start?: Date;
      end?: Date;
    }
  | {
      kind: "events_by_type";
      start?: Date;
      end?: Date;
    }
  | {
      kind: "top_pages";
      start?: Date;
      end?: Date;
      topK: number;
    }
  | {
      kind: "events_over_time";
      start?: Date;
      end?: Date;
      granularity: "hour" | "day";
    };

function buildInternalPrompt(req: AiQueryRequest) {
  const timeRange = req.timeRange
    ? {
        start: req.timeRange.start?.toISOString(),
        end: req.timeRange.end?.toISOString(),
      }
    : undefined;

  return {
    system:
      "You are an analytics query engine. Translate the user's natural language into ONE of the allowed internal query plans. Output MUST be valid JSON only (no markdown). Allowed kinds: page_views_total, events_by_type, top_pages, events_over_time.",
    user: JSON.stringify({
      question: req.question,
      timeRange,
      granularity: req.granularity,
      topK: req.topK,
    }),
  };
}

function parseInternalPlan(content: string): InternalQueryPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI_QUERY_PLAN_INVALID_JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI_QUERY_PLAN_INVALID");
  }

  const obj = parsed as Record<string, unknown>;
  const kind = obj.kind;

  switch (kind) {
    case "page_views_total":
      return {
        kind,
        start: obj.start ? new Date(String(obj.start)) : undefined,
        end: obj.end ? new Date(String(obj.end)) : undefined,
      };
    case "events_by_type":
      return {
        kind,
        start: obj.start ? new Date(String(obj.start)) : undefined,
        end: obj.end ? new Date(String(obj.end)) : undefined,
      };
    case "top_pages": {
      const topK = typeof obj.topK === "number" ? obj.topK : undefined;
      if (!topK) throw new Error("AI_QUERY_PLAN_MISSING_TOPK");
      return {
        kind,
        start: obj.start ? new Date(String(obj.start)) : undefined,
        end: obj.end ? new Date(String(obj.end)) : undefined,
        topK,
      };
    }
    case "events_over_time": {
      const granularity =
        obj.granularity === "hour" || obj.granularity === "day"
          ? (obj.granularity as "hour" | "day")
          : undefined;
      if (!granularity) throw new Error("AI_QUERY_PLAN_MISSING_GRANULARITY");
      return {
        kind,
        start: obj.start ? new Date(String(obj.start)) : undefined,
        end: obj.end ? new Date(String(obj.end)) : undefined,
        granularity,
      };
    }
    default:
      throw new Error("AI_QUERY_PLAN_UNSUPPORTED_KIND");
  }
}

export async function runAiQueryEngine(req: AiQueryRequest, workspaceId: string) {
  const planPrompt = buildInternalPrompt(req);

  const completion = await createOpenRouterChatCompletion({
    messages: [
      { role: "system", content: planPrompt.system },
      { role: "user", content: planPrompt.user },
    ],
  });

  const plan = parseInternalPlan(completion.content);

  const filter: AnalyticsFilter = {
    workspaceId,
    start: plan.start,
    end: plan.end,
  };

  // Execute ONLY analytics.service.ts functions.
  // Never import Prisma here; these are the reuse points.
  switch (plan.kind) {
    case "page_views_total": {
      const totalPageViews = await getTotalPageViews(filter);
      return {
        metrics: { totalPageViews },
        // Minimal answer synthesis to avoid a second LLM step.
        answer: `Total page views: ${totalPageViews}`,
      };
    }
    case "events_by_type": {
      const eventsByType = await getEventsByType(filter);
      return {
        metrics: { eventsByType },
        answer: `Events by type computed for the selected range.`,
      };
    }
    case "top_pages": {
      const topPages = await getTopPages(filter, plan.topK);
      return {
        metrics: { topPages },
        answer: `Top pages computed for the selected range.`,
      };
    }
    case "events_over_time": {
      const series = await getEventsOverTime(
        filter,
        plan.granularity
      );
      return {
        metrics: { eventsOverTime: series },
        answer: `Events over time computed for the selected range.`,
      };
    }
  }
}

