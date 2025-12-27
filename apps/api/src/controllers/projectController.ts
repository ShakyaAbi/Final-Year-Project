import { Request, Response } from 'express';
import * as projectService from '../services/projectService';
import { asyncHandler } from '../utils/asyncHandler';

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
