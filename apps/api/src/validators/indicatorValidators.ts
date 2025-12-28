import { z } from 'zod';
import { IndicatorDataType } from '@prisma/client';

const numericId = z
  .string()
  .regex(/^\d+$/)
  .transform((v) => Number(v));

export const projectIndicatorParamsSchema = {
  params: z.object({
    projectId: numericId
  })
};

export const indicatorIdParamsSchema = {
  params: z.object({
    id: numericId
  })
};

export const createIndicatorSchema = {
  body: z.object({
    logframeNodeId: z.number().int(),
    name: z.string().min(1),
    unit: z.string().min(1),
    baselineValue: z.number().optional().nullable(),
    targetValue: z.number().optional().nullable(),
    dataType: z.nativeEnum(IndicatorDataType),
    minValue: z.number().optional().nullable(),
    maxValue: z.number().optional().nullable()
  })
};

export const updateIndicatorSchema = {
  ...indicatorIdParamsSchema,
  body: z.object({
    projectId: z.number().int().optional(),
    logframeNodeId: z.number().int().optional(),
    name: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    baselineValue: z.number().optional().nullable(),
    targetValue: z.number().optional().nullable(),
    dataType: z.nativeEnum(IndicatorDataType).optional(),
    minValue: z.number().optional().nullable(),
    maxValue: z.number().optional().nullable()
  })
};
