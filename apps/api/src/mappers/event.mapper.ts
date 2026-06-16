import type { Prisma } from "@prisma/client";

import type { CoreEventInput } from "../validation/event.schema";




/**
 * Maps a validated CoreEventInput into Prisma's EventCreateInput.
 *
 * Architectural rule: this mapper is the ONLY valid place where
 * CoreEventInput is converted into the Prisma shape.
 */
export function toPrismaEvent(input: CoreEventInput): Prisma.EventCreateInput {
  return {
    event_id: input.event_id,
    event_type: input.event_type,
    timestamp: new Date(input.timestamp),
    url: input.url,
    user_agent: input.user_agent,
    properties: input.properties as Prisma.InputJsonValue,
    workspace: {
      connect: {
        id: input.workspace_id,
      },
    },
  };
}


