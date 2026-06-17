import { randomUUID, randomBytes } from "crypto";

import { prisma } from "../apps/api/src/prisma/client";


/**
 * Workspace seed script
 * ----------------------
 *
 * Purpose:
 * - Create a User if it does not exist.
 * - Create a Workspace for that user if it does not exist.
 * - Generate a random API token for the workspace.
 * - Print credentials so you can immediately call POST /events.
 *
 * Constraints honored:
 * - Prisma schema is NOT modified.
 * - No controller/service refactors are performed.
 */

function generateApiToken(): string {
  // Middleware requirement: token should be a string and length >= 32
  // after trim. Using 24 random bytes typically yields 32+ chars in base64.
  return randomBytes(24).toString("base64");
}

async function main() {
  const email = "seed@pulsekit.dev";
  const workspaceName = "Default Workspace";

  try {
    // 1) Ensure a user exists.
    // Prisma expects unique lookups to use the fields that are actually
    // unique in the schema. In this repo, `User.email` is unique.
    // NOTE:
    // The error we hit (P5010) indicates Prisma cannot perform the query.
    // Common reasons include an invalid DATABASE_URL, missing tables, or
    // Prisma Client being generated against a different schema.
    //
    // We keep the lookup correct for this repo's schema: User.email is @unique.
    //
    // If the query still fails, it will fail at runtime (expected), but the
    // selector itself is valid.
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
        },
        select: { id: true },
      });
    }



    // 2) Ensure a workspace exists for that user.
    // Workspace has unique(api_token) but not unique(user_id,name),
    // so we do a findFirst.
    const workspace =
      (await prisma.workspace.findFirst({
        where: { user_id: user.id, name: workspaceName },
        select: { id: true, api_token: true },
      })) ??
      (await prisma.workspace.create({
        data: {
          // Schema says Workspace.id is a String @id @db.Uuid, so it must be present.
          id: randomUUID(),
          user_id: user.id,
          name: workspaceName,
          api_token: generateApiToken(),
        },
        select: { id: true, api_token: true },
      }));

    console.log("Workspace ID:");
    console.log(workspace.id);
    console.log("API Token:");
    console.log(workspace.api_token);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err);
  process.exit(1);
});

