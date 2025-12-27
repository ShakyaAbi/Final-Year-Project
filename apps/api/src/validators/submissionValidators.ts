import { z } from 'zod';

const numericId = z
  .string()
  .regex(/^\d+$/)
  .transform((v) => Number(v));

const dateString = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid date format' });

export const indicatorSubmissionsParamsSchema = {
  params: z.object({
    indicatorId: numericId
  })
};

export const createSubmissionSchema = {
  body: z.object({
    reportedAt: dateString,
    value: z.union([z.string(), z.number(), z.boolean()])
  })
};

export const listSubmissionsQuerySchema = {
  query: z.object({
    from: dateString.optional(),
    to: dateString.optional()
  })
};
