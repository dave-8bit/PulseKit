// NOTE: This project root installs @prisma/client, but the PrismaClient types
// are generated under `.prisma` and may not be available at author-time.
//
// To keep ingestion code compiling in this repo snapshot, we import PrismaClient
// dynamically at runtime and provide a typed placeholder.

export type PrismaClientLike = {
  event: {
    create: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
  };
};

let prisma: PrismaClientLike;

async function getPrisma(): Promise<PrismaClientLike> {
  if (prisma) return prisma;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient({});
  return prisma;
}

export const prismaClientPromise = getPrisma();

