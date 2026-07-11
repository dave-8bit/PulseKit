import { z } from "zod";

const isoDate = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v));

export const analyticsCommonQuerySchema = z.object({
  start: isoDate.optional(),
  end: isoDate.optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .pipe(
      z
        .number()
        .int()
        .positive()
        .optional()
    ),
});

export const granularitySchema = z.enum(["hour", "day"]);

export const eventsOverTimeQuerySchema = analyticsCommonQuerySchema.extend({
  granularity: granularitySchema,
});

