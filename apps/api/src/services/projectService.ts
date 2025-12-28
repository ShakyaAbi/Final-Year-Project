import { ProjectStatus } from '@prisma/client';
import * as projectRepo from '../repositories/projectRepository';
import { NotFoundError } from '../utils/errors';

const parseDate = (value?: string | null) => (value ? new Date(value) : null);

export const createProject = async (data: {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  sectors?: string[];
  location?: string;
  donor?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
}) => {
  return projectRepo.createProject({
    name: data.name,
    description: data.description ?? null,
    status: data.status ?? ProjectStatus.DRAFT,
    startDate: parseDate(data.startDate),
    endDate: parseDate(data.endDate),
    sectors: data.sectors ?? [],
    location: data.location ?? null,
    donor: data.donor ?? null,
    budgetAmount: data.budgetAmount ?? null,
    budgetCurrency: data.budgetCurrency ?? null
  });
};

export const listProjects = async () => projectRepo.getProjects();

export const getProject = async (id: number) => {
  const project = await projectRepo.getProjectById(id);
  if (!project) {
    throw new NotFoundError('PROJECT_NOT_FOUND', 'Project not found');
  }
  return project;
};

export const updateProject = async (
  id: number,
  data: Partial<{
    name: string;
    description: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
    sectors: string[];
    location: string;
    donor: string;
    budgetAmount: number;
    budgetCurrency: string;
  }>
) => {
  await getProject(id);
  return projectRepo.updateProject(id, {
    name: data.name,
    description: data.description,
    status: data.status,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    sectors: data.sectors,
    location: data.location,
    donor: data.donor,
    budgetAmount: data.budgetAmount,
    budgetCurrency: data.budgetCurrency
  });
};

export const deleteProject = async (id: number) => {
  await getProject(id);
  return projectRepo.deleteProject(id);
};
