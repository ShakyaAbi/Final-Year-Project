import { Request, Response } from "express";
import * as submissionService from "../services/submissionService";
import { asyncHandler } from "../utils/asyncHandler";

export const createSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const indicatorId = Number(req.params.indicatorId);
    const submission = await submissionService.createSubmission(
      indicatorId,
      req.body,
      req.user!.id
    );
    res.status(201).json(submission);
  }
);

export const listSubmissions = asyncHandler(
  async (req: Request, res: Response) => {
    const indicatorId = Number(req.params.indicatorId);
    const submissions = await submissionService.listSubmissions(
      indicatorId,
      req.query as any
    );
    res.json(submissions);
  }
);

export const acknowledgeAnomaly = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.acknowledgeAnomaly(
      submissionId,
      req.user!.id,
      req.body.notes
    );
    res.json(submission);
  }
);

export const resolveAnomaly = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.resolveAnomaly(
      submissionId,
      req.user!.id,
      req.body.notes
    );
    res.json(submission);
  }
);

export const markAnomalyFalsePositive = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.markAnomalyFalsePositive(
      submissionId,
      req.user!.id,
      req.body.notes
    );
    res.json(submission);
  }
);

export const updateAnomalyStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.updateAnomalyStatus(
      submissionId,
      req.body.status,
      req.user!.id,
      req.body.notes
    );
    res.json(submission);
  }
);
