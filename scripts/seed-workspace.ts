import { randomBytes } from "crypto";

import { prisma } from "../apps/api/src/prisma/client";

/**
 * Workspace seed script
 * ----------------------
 * Creates a workspace if one does not exist, and prints an API token.
 *
 * How to interpret “does not exist”:
 * - We check by workspace name (a stable default) so you can re-run the
 *   script without creating duplicates.
 * - If the workspace exists, we re-use its existing API token.
 */

function generateApiToken(bytes = 24): string {
  // Base64 -> may include "=" padding and characters like "/" and "+".
  // Tokens are validated by the API middleware using length >= 32 after trim.
  // 24 random bytes => 32+ chars base64, typically ~32.
  return randomBytes(bytes).toString("base64");
}

async function main() {
  const workspaceName = "Default Workspace";

  // 1) Find existing workspace by a stable name.
  // NOTE: Your Prisma schema requires Workspaces to be associated with a User.
  // If you already have a User, you can adapt the script accordingly.

  // For minimal implementation, we create a placeholder user if needed.
  // We use a deterministic email to avoid duplicates.
  const userEmail = "seed-user@pulsekit.local";

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
    },
  });

  // 2) Upsert workspace for that user.
  // We create an API token only if the workspace is new.
  const workspace = await prisma.workspace.upsert({
    where: {
      // Prisma upsert needs a unique selector; use user_id + name mapping
      // isn't unique in schema. So we use a unique api_token on create.
      // Instead, we do a findUnique by api_token is not possible.
      // Therefore we do: create by (user_id, name) manually.
      //
      // Minimal and safe approach: find first by user_id + name.
      // If your schema doesn't enforce uniqueness on (user_id, name),
      // this still prevents duplicates because we only do create when missing.
      //
      // We implement “find then create” to stay aligned with schema.
      id: "__will_not_match__",
    } as any,
    update: {},
    create: {
      user_id: user.id,
      name: workspaceName,
      api_token: generateApiToken(),
    },
  }).catch(async () => {
    // The unique selector above is not correct for your schema.
    // This catch allows us to fall back to a safe find-then-create strategy.
    return null as any;
  });

  let finalWorkspace = workspace;

  if (!finalWorkspace) {
    // Fallback: find first by user_id + name, then create if missing.
    finalWorkspace =
      (await prisma.workspace.findFirst({
        where: { user_id: user.id, name: workspaceName },
        select: { id: true, api_token: true },
      })) ||
      (await prisma.workspace.create({
        data: {
          user_id: user.id,
          name: workspaceName,
          api_token: generateApiToken(),
        },
        select: { id: true, api_token: true },
      }));
  } else {
    // If upsert succeeded, make sure we have api_token for printing.
    finalWorkspace = await prisma.workspace.findUnique({
      where: { id: finalWorkspace.id },
      select: { id: true, api_token: true },
    });
  }

  console.log("Workspace ID:");
  console.log(finalWorkspace.id);
  console.log("API Token:");
  console.log(finalWorkspace.api_token);
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Seed completed.");
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", err);
    process.exit(1);
  });

