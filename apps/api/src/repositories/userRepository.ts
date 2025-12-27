import { Role } from '@prisma/client';
import { prisma } from '../prisma';

export const findByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

export const findById = (id: number) => prisma.user.findUnique({ where: { id } });

export const create = (data: { email: string; passwordHash: string; role: Role }) =>
  prisma.user.create({ data });
