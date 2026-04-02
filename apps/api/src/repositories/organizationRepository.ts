import { prisma } from "../prisma";

export const findById = (id: number) =>
  prisma.organization.findUnique({ where: { id } });

export const findByName = (name: string) =>
  prisma.organization.findFirst({ where: { name } });

export const findAll = () =>
  prisma.organization.findMany({ orderBy: { name: 'asc' } });

export const create = (data: { name: string }) =>
  prisma.organization.create({ data });

export const updateById = (id: number, data: { name?: string }) =>
  prisma.organization.update({ where: { id }, data });

export const deleteById = (id: number) =>
  prisma.organization.delete({ where: { id } });

export const getUsers = (organizationId: number) =>
  prisma.user.findMany({ where: { organizationId } });

export const getProjects = (organizationId: number) =>
  prisma.project.findMany({ where: { organizationId } });
