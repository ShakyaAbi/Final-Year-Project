import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
    jobTitle: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    organizationId: z.number().int().positive().optional(),
    organizationName: z.string().min(1).optional(),
    invitationToken: z.string().optional()
  }).refine(data => data.organizationId || data.organizationName || data.invitationToken, {
    message: "Either organizationId, organizationName, or invitationToken is required"
  })
};

export const createInvitationSchema = {
  body: z.object({
    email: z.string().email(),
    role: z.nativeEnum(Role).default(Role.DATA_ENTRY)
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

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8)
  })
};
