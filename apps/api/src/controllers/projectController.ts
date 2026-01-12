import { Request, Response } from 'express';
import { IndicatorDataType } from '@prisma/client';
import * as projectService from '../services/projectService';
import { asyncHandler } from '../utils/asyncHandler';
import { formatRelativeTime, initialsFromName } from '../utils/time';

const assessAnomaly = (dataType: IndicatorDataType, value: string, min?: number | null, max?: number | null) => {
  if (dataType === 'NUMBER') {
    const num = Number(value);
    if (!Number.isFinite(num)) return false;
    if (min !== null && min !== undefined && num < min) return true;
    if (max !== null && max !== undefined && num > max) return true;
    return false;
  }
  if (dataType === 'PERCENT') {
    const num = Number(value);
    if (!Number.isFinite(num)) return false;
    const lower = min ?? 0;
    const upper = max ?? 100;
    return num < lower || num > upper;
  }
  return false;
};

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.createProject(req.body);
  res.status(201).json(project);
});

export const listProjects = asyncHandler(async (_req: Request, res: Response) => {
  const projects = await projectService.listProjects();
  res.json(projects);
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.getProject(Number(req.params.id));
  res.json(project);
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.updateProject(Number(req.params.id), req.body);
  res.json(project);
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.deleteProject(Number(req.params.id));
  res.json(project);
});

export const getProjectStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await projectService.getProjectStats(Number(req.params.id));
  res.json(stats);
});

export const getProjectActivities = asyncHandler(async (req: Request, res: Response) => {
  const activities = await projectService.getProjectActivities(Number(req.params.id));
  const response = activities.map((submission) => {
    const userName = submission.createdByUser.name || submission.createdByUser.email;
    const isAnomaly = assessAnomaly(
      submission.indicator.dataType,
      submission.value,
      submission.indicator.minValue,
      submission.indicator.maxValue
    );
    return {
      id: `submission-${submission.id}`,
      user: userName,
      userInitials: initialsFromName(userName),
      action: 'submitted data for',
      item: submission.indicator.name,
      date: formatRelativeTime(submission.createdAt),
      type: isAnomaly ? 'warning' : 'success'
    };
  });
  res.json(response);
});
