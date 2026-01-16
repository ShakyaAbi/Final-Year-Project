import { z } from 'zod';
import { IndicatorDataType } from '@prisma/client';

const numericId = z
  .string()
  .regex(/^\d+$/)
  .transform((v) => Number(v));

const anomalyConfigSchema = z.object({
  enabled: z.boolean().default(false),
  outlier: z.object({
    method: z.enum(['MAD', 'IQR']).default('MAD'),
    threshold: z.number().positive().default(3.5),
    windowSize: z.number().int().min(2).max(50).default(8),
    minPoints: z.number().int().min(2).default(6)
  }).optional(),
  trend: z.object({
    method: z.enum(['SLOPE_SHIFT', 'MEAN_SHIFT']).default('SLOPE_SHIFT'),
    threshold: z.number().positive().default(2),
    windowSize: z.number().int().min(3).max(50).default(6)
  }).optional()
}).optional().nullable();

const categoryDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional()
});

const categoryConfigSchema = z.object({
  allowMultiple: z.boolean().optional(),
  maxSelections: z.number().int().positive().optional(),
  required: z.boolean().optional(),
  allowOther: z.boolean().optional()
}).optional().nullable();

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
    maxValue: z.number().optional().nullable(),
    anomalyConfig: anomalyConfigSchema,
    categories: z.array(categoryDefinitionSchema).optional().nullable(),
    categoryConfig: categoryConfigSchema
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
    maxValue: z.number().optional().nullable(),
    anomalyConfig: anomalyConfigSchema,
    categories: z.array(categoryDefinitionSchema).optional().nullable(),
    categoryConfig: categoryConfigSchema
  })
};
