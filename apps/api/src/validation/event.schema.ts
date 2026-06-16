/**
 * Runtime validation for incoming analytics events.
 *
 * Why: clients are untrusted. Validating at the boundary prevents malformed data
 * from corrupting analytics integrity and downstream processing.
 */

import { z } from "zod";

import type { Prisma } from "@prisma/client";

import type { CoreEvent } from "../types/event.types";
import { CoreEventType } from "../types/event.types";

// Zod schema for CoreEvent.
// Note: we validate only shape/primitive safety here (not database/API concerns).
export const eventSchema = z.object({
  event_id: z.string(),
  workspace_id: z.string(),
  event_type: z.nativeEnum(CoreEventType),
  timestamp: z.string(),
  url: z.string(),
  user_agent: z.string(),

  // Prisma JSON input type (runtime remains a safe JSON-ish object bag).
  properties: z.record(z.unknown()) as z.ZodType<Prisma.InputJsonValue>,
});

export type CoreEventInput = z.input<typeof eventSchema>;
export type CoreEventOutput = z.infer<typeof eventSchema>;

/**
 * Wrapper around schema.parse to provide a single validation entry point.
 */
export const CoreEventValidator = {
  parse: (input: CoreEventInput): CoreEvent => {
    return eventSchema.parse(input) as CoreEvent;
  },
};


