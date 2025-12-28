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
  budgetCurrency: string | null;
}) => prisma.project.create({ data });

export const getProjects = () => prisma.project.findMany({ orderBy: { createdAt: 'desc' } });

export const getProjectById = (id: number) => prisma.project.findUnique({ where: { id } });

export const updateProject = (
  id: number,
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
    budgetCurrency: string | null;
  }>
) => prisma.project.update({ where: { id }, data });

export const deleteProject = (id: number) => prisma.project.delete({ where: { id } });
