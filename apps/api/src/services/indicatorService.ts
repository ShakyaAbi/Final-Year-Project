import { IndicatorDataType } from '@prisma/client';
import * as indicatorRepo from '../repositories/indicatorRepository';
import * as projectRepo from '../repositories/projectRepository';
import * as logframeRepo from '../repositories/logframeRepository';
import { BadRequestError, NotFoundError } from '../utils/errors';

const ensureProject = async (projectId: number) => {
  const project = await projectRepo.getProjectById(projectId);
  if (!project) throw new NotFoundError('PROJECT_NOT_FOUND', 'Project not found');
  return project;
};

const ensureNodeInProject = async (logframeNodeId: number, projectId: number) => {
  const node = await logframeRepo.getById(logframeNodeId);
  if (!node || node.projectId !== projectId) {
    throw new BadRequestError('INVALID_LOGFRAME_NODE', 'Logframe node must exist within the project');
  }
  return node;
};

export const createIndicator = async (
  projectId: number,
  data: {
    logframeNodeId: number;
    name: string;
    unit: string;
    baselineValue?: number | null;
    targetValue?: number | null;
    dataType: IndicatorDataType;
    minValue?: number | null;
    maxValue?: number | null;
  }
) => {
  await ensureProject(projectId);
  await ensureNodeInProject(data.logframeNodeId, projectId);

  return indicatorRepo.createIndicator({
    projectId,
    logframeNodeId: data.logframeNodeId,
    name: data.name,
    unit: data.unit,
    baselineValue: data.baselineValue ?? null,
    targetValue: data.targetValue ?? null,
    dataType: data.dataType,
    minValue: data.minValue ?? null,
    maxValue: data.maxValue ?? null
  });
};

export const getIndicators = async (projectId: number) => {
  await ensureProject(projectId);
  return indicatorRepo.getIndicatorsByProject(projectId);
};

export const getIndicatorById = async (id: number, includeSubmissions = false) => {
  const indicator = includeSubmissions
    ? await indicatorRepo.getByIdWithSubmissions(id)
    : await indicatorRepo.getById(id);
  if (!indicator) throw new NotFoundError('INDICATOR_NOT_FOUND', 'Indicator not found');
  return indicator;
};

export const updateIndicator = async (
  id: number,
  data: Partial<{
    projectId: number;
    logframeNodeId: number;
    name: string;
    unit: string;
    baselineValue: number | null;
    targetValue: number | null;
    dataType: IndicatorDataType;
    minValue: number | null;
    maxValue: number | null;
  }>
) => {
  const indicator = await indicatorRepo.getById(id);
  if (!indicator) throw new NotFoundError('INDICATOR_NOT_FOUND', 'Indicator not found');

  const projectId = data.projectId ?? indicator.projectId;
  await ensureProject(projectId);

  if (data.logframeNodeId) {
    await ensureNodeInProject(data.logframeNodeId, projectId);
  }

  return indicatorRepo.updateIndicator(id, {
    projectId,
    logframeNodeId: data.logframeNodeId,
    name: data.name,
    unit: data.unit,
    baselineValue: data.baselineValue,
    targetValue: data.targetValue,
    dataType: data.dataType,
    minValue: data.minValue,
    maxValue: data.maxValue
  });
};
