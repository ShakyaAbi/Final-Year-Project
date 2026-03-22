import { z } from 'zod';
import { NodeType } from '@prisma/client';

const numericId = z.union([
  z.string().regex(/^\d+$/).transform((v) => Number(v)),
  z.number().int()
]);


export const projectLogframeParamsSchema = {
  params: z.object({
    projectId: numericId
  })
};

export const createLogframeNodeSchema = {
  body: z.object({
    type: z.nativeEnum(NodeType),
    title: z.string().min(1),
    description: z.string().optional(),
    assumptions: z.string().optional(),
    risks: z.string().optional(),
    parentId: numericId.nullable().optional(),
    sortOrder: z.number().int().optional()
  })
};

export const logframeNodeIdParamsSchema = {
  params: z.object({
    id: numericId
  })
};

export const updateLogframeNodeSchema = {
  ...logframeNodeIdParamsSchema,
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    assumptions: z.string().optional(),
    risks: z.string().optional(),
    parentId: numericId.nullable().optional(),
    sortOrder: z.number().int().optional(),
    type: z.nativeEnum(NodeType).optional()
  })
};
