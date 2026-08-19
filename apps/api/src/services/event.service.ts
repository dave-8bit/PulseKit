import { prisma } from "../prisma/client";
import type { Prisma } from "@prisma/client";

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
 * Create a new event (standalone, no transaction).
 *
 * Why the input type matters:
 * - By accepting `Prisma.EventCreateInput` we keep this service strongly typed.
 * - That reduces technical debt (no `any`) and helps TypeScript catch mistakes
 *   at compile time.
 */
export async function createEvent(
  eventData: Prisma.EventCreateInput
) {
  return prisma.event.create({
    data: eventData,
  });
}

/**
 * Create a new event inside an existing Prisma transaction.
 *
 * This is the transaction-aware counterpart of createEvent.
 * It must be called from within a `prisma.$transaction` callback.
 */
export async function createEventWithTx(
  tx: Prisma.TransactionClient,
  eventData: Prisma.EventCreateInput
) {
  return tx.event.create({
    data: eventData,
  });
}

