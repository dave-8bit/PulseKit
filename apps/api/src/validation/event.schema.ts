/**
 * Runtime validation for incoming analytics events.
 *
 * Why: clients are untrusted. Validating at the boundary prevents malformed data
 * from corrupting analytics integrity and downstream processing.
 */

import { z } from "zod";


import type { CoreEvent } from "../types/event.types";

import { CoreEventType } from "../types/event.types";

// Zod schema for CoreEvent.
// Note: we validate only shape/primitive safety here (not database/API concerns).
export const eventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.nativeEnum(CoreEventType),
  timestamp: z.string(),
  url: z.string(),
  user_agent: z.string(),

  // JSON properties bag (Prisma accepts nested JSON: object/array/scalar/null)
  properties: z.any(),
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



