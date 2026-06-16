import { prisma } from "../prisma/client";

/**
 * Service-layer helper: findWorkspaceByApiToken
 *
 * What is a “service layer”?
 * In many Express apps, controllers are meant to be thin:
 *   - read/parse request data
 *   - call domain/service functions
 *   - return the response
 *
 * A service layer holds reusable business logic and database access.
 *
 * Why move DB access out of controllers?
 * - Controllers should stay small and focused on HTTP concerns.
 * - Keeping Prisma calls in services improves readability and testability.
 * - It makes it easier to reuse the same data-fetching logic elsewhere.
 *
 * Why return only the fields needed?
 * - This query selects only `id`.
 * - Fetching fewer columns reduces data transfer and can improve performance.
 * - It also limits accidental dependency on extra fields.
 */
export async function findWorkspaceByApiToken(apiToken: string) {
  return prisma.workspace.findUnique({
    where: {
      api_token: apiToken,
    },
    select: {
      id: true,
    },
  });
}

