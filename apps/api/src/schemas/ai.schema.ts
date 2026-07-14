import { z } from "zod";

const isoDate = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v));

export const aiQueryRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  timeRange: z
    .object({
      start: isoDate.optional(),
      end: isoDate.optional(),
    })
    .optional(),
  granularity: z.enum(["hour", "day"]).optional(),
  topK: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
});

export type AiQueryRequestSchema = z.infer<typeof aiQueryRequestSchema>;

