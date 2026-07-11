import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";


type AnalyticsFilter = {
  workspaceId: string;
  start?: Date;
  end?: Date;
};

function buildTimeRangeWhere(filter: AnalyticsFilter) {
  // Keep Prisma query objects small and use parameterized raw SQL for time buckets.
  const start = filter.start;
  const end = filter.end;
  return { start, end };
}

export async function getTotalPageViews(filter: AnalyticsFilter) {
  const { start, end } = buildTimeRangeWhere(filter);

  return prisma.event.count({
    where: {
      workspace_id: filter.workspaceId,
      event_type: "page_view",
      ...(start || end
        ? {
            timestamp: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
    },
  });
}

export async function getEventsByType(filter: AnalyticsFilter) {
  const { start, end } = buildTimeRangeWhere(filter);

  // No groupBy for time buckets (not needed here).
  // Use raw aggregation to keep controller/service boundary simple.
  const rows = await prisma.$queryRaw<Array<{ event_type: string; count: bigint }>>`
    SELECT event_type, COUNT(*)::bigint AS count
    FROM events
    WHERE workspace_id = ${filter.workspaceId}
      ${start ? Prisma.sql`AND timestamp >= ${start}` : Prisma.empty}
      ${end ? Prisma.sql`AND timestamp <= ${end}` : Prisma.empty}
    GROUP BY event_type
  `;

  return rows.map((r) => ({ eventType: r.event_type, count: Number(r.count) }));
}

export async function getTopPages(filter: AnalyticsFilter, limit: number) {
  const { start, end } = buildTimeRangeWhere(filter);

  const rows = await prisma.$queryRaw<Array<{ url: string; count: bigint }>>`
    SELECT url, COUNT(*)::bigint AS count
    FROM events
    WHERE workspace_id = ${filter.workspaceId}
      ${start ? Prisma.sql`AND timestamp >= ${start}` : Prisma.empty}
      ${end ? Prisma.sql`AND timestamp <= ${end}` : Prisma.empty}
    GROUP BY url
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({ url: r.url, count: Number(r.count) }));
}

export async function getEventsOverTime(
  filter: AnalyticsFilter,
  granularity: "hour" | "day"
) {
  const { start, end } = buildTimeRangeWhere(filter);

  // PostgreSQL DATE_TRUNC for time buckets.
  // Use raw SQL (do not attempt Prisma groupBy for buckets).
  const rows = await prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
    SELECT DATE_TRUNC(${granularity}, timestamp) AS bucket,
           COUNT(*)::bigint AS count
    FROM events
    WHERE workspace_id = ${filter.workspaceId}
      ${start ? Prisma.sql`AND timestamp >= ${start}` : Prisma.empty}
      ${end ? Prisma.sql`AND timestamp <= ${end}` : Prisma.empty}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((r) => ({
    bucket: r.bucket,
    count: Number(r.count),
  }));
}

