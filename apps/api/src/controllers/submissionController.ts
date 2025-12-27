import { Request, Response } from 'express';
import * as submissionService from '../services/submissionService';
import { asyncHandler } from '../utils/asyncHandler';

export const createSubmission = asyncHandler(async (req: Request, res: Response) => {
  const indicatorId = Number(req.params.indicatorId);
  const submission = await submissionService.createSubmission(indicatorId, req.body, req.user!.id);
  res.status(201).json(submission);
});

export const listSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const indicatorId = Number(req.params.indicatorId);
  const submissions = await submissionService.listSubmissions(indicatorId, req.query as any);
  res.json(submissions);
});
