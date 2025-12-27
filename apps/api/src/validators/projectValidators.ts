import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

const dateString = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid date format' });

export const createProjectSchema = {
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional()
  })
};

export const projectIdParamSchema = {
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/)
      .transform((v) => Number(v))
  })
};

export const updateProjectSchema = {
  ...projectIdParamSchema,
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional()
  })
};
