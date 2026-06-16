import type { Prisma } from "@prisma/client";

import type { CoreEventInput } from "../validation/event.schema";

/**
 * Architectural rule: this mapper is the ONLY valid place where
 * CoreEventInput is converted into the Prisma shape.
 */
function isValidUuidV4(value: string): boolean {
  // Strict RFC 4122 v4 UUID format check.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Pure mapping from validated CoreEventInput into Prisma EventCreateInput.
 */
export function toPrismaEvent(input: CoreEventInput): Prisma.EventCreateInput {
  const eventId = isValidUuidV4(input.event_id) ? input.event_id : crypto.randomUUID();

  return {
    event_id: eventId as unknown as string,
    workspace: {
      connect: {
        id: input.workspace_id,
      },
    },
    event_type: input.event_type,

    timestamp: new Date(input.timestamp),
    url: input.url,
    user_agent: input.user_agent,
    properties: input.properties as unknown as Prisma.InputJsonValue,
  };
}

