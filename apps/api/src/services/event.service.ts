import { prisma } from "../prisma/client";

/**
 * Service-layer helpers for Event persistence.
 *
 * Why services (instead of keeping Prisma queries in controllers)?
 * - Controllers should be thin and mostly HTTP-focused (request/response).
 * - Keeping database access in services makes code easier to reuse and test.
 * - It also prevents controllers from becoming “God files” that mix transport
 *   logic with data-access logic.
 */

/**
 * Find an existing event using the DB unique constraint (workspace_id, event_id).
 *
 * This exact unique constraint is the foundation of idempotency:
 * - If the same event is sent twice, the second request should not create a
 *   duplicate row.
 * - Instead, we return the already-existing record.
 */
export async function findExistingEvent(
  workspaceId: string,
  eventId: string
) {
  return prisma.event.findUnique({
    where: {
      workspace_id_event_id: {
        workspace_id: workspaceId,
        event_id: eventId,
      },
    },
  });
}

/**
 * Create a new event.
 *
 * Note:
 * - We accept `eventData` as `Prisma.EventCreateInput`.
 * - That keeps this service generic: controllers can build the input using
 *   validated payloads + mappers, while the service handles the DB insert.
 */
export async function createEvent(
  eventData: any
) {
  return prisma.event.create({
    data: eventData,
  });
}


