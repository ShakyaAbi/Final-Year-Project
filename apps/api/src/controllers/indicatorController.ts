import { Request, Response } from 'express';
import * as indicatorService from '../services/indicatorService';
import { asyncHandler } from '../utils/asyncHandler';

export const createIndicator = asyncHandler(async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const indicator = await indicatorService.createIndicator(projectId, req.body);
  res.status(201).json(indicator);
});

export const getIndicatorsByProject = asyncHandler(async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const indicators = await indicatorService.getIndicators(projectId);
  res.json(indicators);
});

export const getIndicator = asyncHandler(async (req: Request, res: Response) => {
  const includeSubmissions = req.query.includeSubmissions === 'true';
  const indicator = await indicatorService.getIndicatorById(Number(req.params.id), includeSubmissions);
  res.json(indicator);
});

export const updateIndicator = asyncHandler(async (req: Request, res: Response) => {
  const indicator = await indicatorService.updateIndicator(Number(req.params.id), req.body);
  res.json(indicator);
});
