import { Role } from '@prisma/client';
import { prisma } from '../prisma';

export const findByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

export const findById = (id: number) => prisma.user.findUnique({ where: { id } });

export const create = (data: { email: string; passwordHash: string; role: Role }) =>
  prisma.user.create({ data });

export const updateById = (
  id: number,
  data: Partial<{
    name: string | null;
    jobTitle: string | null;
    organization: string | null;
    timezone: string | null;
    avatar: string | null;
    notificationPreferences: Record<string, any> | null;
  }>
) => prisma.user.update({ where: { id }, data: {
  ...data,
  notificationPreferences: data.notificationPreferences !== undefined ? (data.notificationPreferences as any) : undefined
} });
