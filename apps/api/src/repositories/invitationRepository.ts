import { Role, Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export const findByToken = (token: string) =>
  prisma.invitation.findUnique({ where: { token } });

export const findByEmailAndOrg = (email: string, organizationId: number) =>
  prisma.invitation.findUnique({ 
    where: { 
      email_organizationId: { email, organizationId } 
    } 
  });

export const findByOrganization = (organizationId: number) =>
  prisma.invitation.findMany({ 
    where: { organizationId, acceptedAt: null },
    include: { invitedBy: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'desc' }
  });

export const create = (data: {
  email: string;
  organizationId: number;
  invitedByUserId: number;
  role: Role;
  token: string;
  expiresAt: Date;
}) =>
  prisma.invitation.create({ data });

export const findById = (id: number) =>
  prisma.invitation.findUnique({ where: { id } });

export const deleteById = (id: number) =>
  prisma.invitation.delete({ where: { id } });

export const acceptInvitation = (id: number, data: { acceptedAt: Date }) =>
  prisma.invitation.update({ where: { id }, data });
