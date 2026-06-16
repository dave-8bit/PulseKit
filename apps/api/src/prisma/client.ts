import { PrismaClient } from "@prisma/client";

// Singleton Prisma client to avoid exhausting database connections during dev
// and to behave correctly with hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

