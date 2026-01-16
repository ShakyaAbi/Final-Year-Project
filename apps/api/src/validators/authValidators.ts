import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.nativeEnum(Role)
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
};

export const updateMeSchema = {
  body: z.object({
    name: z.string().min(1).optional().nullable(),
    jobTitle: z.string().min(1).optional().nullable(),
    organization: z.string().min(1).optional().nullable(),
    timezone: z.string().min(1).optional().nullable(),
    avatar: z.string().url().optional().nullable(),
    notificationPreferences: z
      .object({
        emailAlerts: z.boolean(),
        browserPush: z.boolean(),
        weeklyDigest: z.boolean(),
        anomalyAlerts: z.boolean()
      })
      .optional()
      .nullable()
  })
};
