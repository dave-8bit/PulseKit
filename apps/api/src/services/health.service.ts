import { prisma } from "../prisma/client";

/**
 * Health-check service
 * ---------------------
 *
 * Why a service for health?
 * - Keeping the DB connectivity logic out of the route keeps routes small.
 * - It also makes it easier to unit test the connectivity check.
 */
export async function checkDatabaseConnection(): Promise<
  { database: "connected" } | { database: "disconnected" }
> {
  try {
    // Simple connectivity test. If this query succeeds, the DB is reachable.
    // `prisma.$queryRaw` executes raw SQL through Prisma.
    await prisma.$queryRaw`SELECT 1`;

    return { database: "connected" };
  } catch {
    return { database: "disconnected" };
  }
}

