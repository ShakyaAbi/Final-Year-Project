import { ProjectStatus } from '@prisma/client';
import { prisma } from '../prisma';

export const createProject = (data: {
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  sectors: string[];
  location: string | null;
  donor: string | null;
  budgetAmount: number | null;
  budgetSpent: number | null;
  budgetCurrency: string | null;
  organizationId: number;
}) => prisma.project.create({ data });

export const getProjects = (organizationId: number) => prisma.project.findMany({ 
  where: { organizationId },
  include: {
    _count: {
      select: { indicators: true }
    }
  },
  orderBy: { createdAt: 'desc' } 
});

export const getProjectById = (id: number, organizationId: number) => prisma.project.findFirst({ 
  where: { id, organizationId }
});

export const updateProject = (
  id: number,
  organizationId: number,
  data: Partial<{
    name: string;
    description: string | null;
    status: ProjectStatus;
    startDate: Date | null;
    endDate: Date | null;
    sectors: string[];
    location: string | null;
    donor: string | null;
    budgetAmount: number | null;
    budgetSpent: number | null;
    budgetCurrency: string | null;
  }>
) => prisma.project.update({ where: { id, organizationId }, data });

export const deleteProject = (id: number, organizationId: number) => prisma.project.delete({ where: { id, organizationId } });
