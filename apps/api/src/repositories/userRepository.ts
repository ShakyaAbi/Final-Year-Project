import { Role } from "@prisma/client";
import { prisma } from "../prisma";

export const findByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const findById = (id: number) =>
  prisma.user.findUnique({ where: { id } });

export const create = (data: {
  email: string;
  passwordHash: string;
  role: Role;
  organizationId: number;
  name?: string | null;
  jobTitle?: string | null;
  avatar?: string | null;
}) => prisma.user.create({ data });

export const updateById = (
  id: number,
  data: Partial<{
    name: string | null;
    jobTitle: string | null;
    timezone: string | null;
    avatar: string | null;
    notificationPreferences: Record<string, any> | null;
  }>
) =>
  prisma.user.update({
    where: { id },
    data: {
      ...data,
      notificationPreferences:
        data.notificationPreferences !== undefined
          ? (data.notificationPreferences as any)
          : undefined,
    },
  });

export const updatePasswordById = (id: number, passwordHash: string) =>
  prisma.user.update({ where: { id }, data: { passwordHash } });

export const updateRole = (id: number, role: Role) =>
  prisma.user.update({ where: { id }, data: { role } });

export const deleteById = (id: number) =>
  prisma.user.delete({ where: { id } });
