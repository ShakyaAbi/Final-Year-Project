import { z } from 'zod';
import { AnomalyStatus } from '@prisma/client';

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
    value: z.union([z.string(), z.number(), z.boolean()]),
    evidence: z.string().optional().nullable()
  })
};

export const listSubmissionsQuerySchema = {
  query: z.object({
    from: dateString.optional(),
    to: dateString.optional()
  })
};

export const submissionIdParamsSchema = {
  params: z.object({
    id: numericId
  })
};

export const acknowledgeAnomalySchema = {
  ...submissionIdParamsSchema,
  body: z.object({
    notes: z.string().optional()
  })
};

export const updateAnomalyStatusSchema = {
  ...submissionIdParamsSchema,
  body: z.object({
    status: z.nativeEnum(AnomalyStatus),
    notes: z.string().optional()
  })
};
