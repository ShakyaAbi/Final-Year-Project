import { NodeType } from '@prisma/client';
import { prisma } from '../prisma';

export const createNode = (data: {
  projectId: number;
  type: NodeType;
  title: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
}) => prisma.logframeNode.create({ data });

export const getByProject = (projectId: number) =>
  prisma.logframeNode.findMany({ where: { projectId }, orderBy: { sortOrder: 'asc' } });

export const getById = (id: number) => prisma.logframeNode.findUnique({ where: { id } });

export const updateNode = (
  id: number,
  data: Partial<{
    title: string;
    description: string | null;
    parentId: number | null;
    sortOrder: number;
    type: NodeType;
  }>
) => prisma.logframeNode.update({ where: { id }, data });

export const deleteNode = (id: number) => prisma.logframeNode.delete({ where: { id } });

export const getChildrenCount = (id: number) => prisma.logframeNode.count({ where: { parentId: id } });
