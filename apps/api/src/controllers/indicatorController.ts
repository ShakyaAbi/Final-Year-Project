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

export const getIndicatorStats = asyncHandler(async (req: Request, res: Response) => {
  const indicator = await indicatorService.getIndicatorWithStats(Number(req.params.id));
  res.json(indicator);
});

export const getReportingGaps = asyncHandler(async (req: Request, res: Response) => {
  const indicator = await indicatorService.getIndicatorById(
    Number(req.params.id), 
    true
  );
  
  const frequency = (req.query.frequency as 'DAILY' | 'WEEKLY' | 'MONTHLY') || 'MONTHLY';
  const submissions = (indicator as any).submissions || [];
  const gaps = indicatorService.detectReportingGaps(submissions, frequency);
  
  res.json({
    indicatorId: indicator.id,
    frequency,
    totalSubmissions: submissions.length,
    gaps
  });
});

export const getCategoryDistribution = asyncHandler(async (req: Request, res: Response) => {
  const indicatorWithStats = await indicatorService.getIndicatorWithStats(Number(req.params.id));
  
  if (indicatorWithStats.dataType !== 'CATEGORICAL') {
    res.status(400).json({
      error: {
        code: 'NOT_CATEGORICAL',
        message: 'This endpoint only works with CATEGORICAL indicators'
      }
    });
    return;
  }
  
  res.json({
    indicatorId: indicatorWithStats.id,
    indicatorName: indicatorWithStats.name,
    categories: indicatorWithStats.categories,
    distribution: (indicatorWithStats.stats as any)?.categoryDistribution || [],
    mostFrequent: (indicatorWithStats.stats as any)?.mostFrequent || null,
    totalSubmissions: (indicatorWithStats.stats as any)?.submissionCount || 0
  });
});
