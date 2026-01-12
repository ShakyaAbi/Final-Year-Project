import { NodeType, ProjectStatus } from '@prisma/client';
import * as projectRepo from '../repositories/projectRepository';
import { NotFoundError } from '../utils/errors';
import { prisma } from '../prisma';

const parseDate = (value?: string | null) => (value ? new Date(value) : null);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const diffDays = (start: Date, end: Date) =>
  Math.max(0, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));

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

export const getProjectStats = async (id: number) => {
  const project = await getProject(id);
  const now = new Date();

  const daysTotal =
    project.startDate && project.endDate ? diffDays(project.startDate, project.endDate) : 0;
  const endCap = project.endDate && project.endDate < now ? project.endDate : now;
  const daysElapsed =
    project.startDate ? diffDays(project.startDate, endCap) : 0;

  const activitiesTotal = await prisma.logframeNode.count({
    where: { projectId: project.id, type: NodeType.ACTIVITY }
  });

  const activityNodes = await prisma.logframeNode.findMany({
    where: { projectId: project.id, type: NodeType.ACTIVITY },
    include: { indicators: { include: { submissions: { select: { id: true } } } } }
  });
  const activitiesCompleted = activityNodes.filter((node) =>
    node.indicators.some((indicator) => indicator.submissions.length > 0)
  ).length;

  return {
    budgetTotal: project.budgetAmount ?? 0,
    budgetSpent: 0,
    daysTotal,
    daysElapsed,
    beneficiariesTarget: 0,
    beneficiariesReached: 0,
    activitiesTotal,
    activitiesCompleted
  };
};

export const getProjectActivities = async (id: number) => {
  await getProject(id);
  return prisma.submission.findMany({
    where: { indicator: { projectId: id } },
    include: {
      indicator: true,
      createdByUser: true
    },
    orderBy: { createdAt: 'desc' },
    take: 30
  });
};
