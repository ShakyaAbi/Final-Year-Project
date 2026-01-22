import { Request, Response } from "express";
import * as indicatorService from "../services/indicatorService";
import { asyncHandler } from "../utils/asyncHandler";

export const createIndicator = asyncHandler(
  async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const userId = req.user?.id || 1; // Fallback to admin if no user
    const indicator = await indicatorService.createIndicator(
      projectId,
      req.body,
      userId,
    );
    res.status(201).json(indicator);
  },
);

export const getIndicatorsByProject = asyncHandler(
  async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const indicators = await indicatorService.getIndicators(projectId);
    res.json(indicators);
  },
);

export const getIndicator = asyncHandler(
  async (req: Request, res: Response) => {
    const includeSubmissions = req.query.includeSubmissions === "true";
    const indicator = await indicatorService.getIndicatorById(
      Number(req.params.id),
      includeSubmissions,
    );
    res.json(indicator);
  },
);

export const updateIndicator = asyncHandler(
  async (req: Request, res: Response) => {
    const indicator = await indicatorService.updateIndicator(
      Number(req.params.id),
      req.body,
    );
    res.json(indicator);
  },
);

export const getIndicatorStats = asyncHandler(
  async (req: Request, res: Response) => {
    const indicator = await indicatorService.getIndicatorWithStats(
      Number(req.params.id),
    );
    res.json(indicator);
  },
);

export const getReportingGaps = asyncHandler(
  async (req: Request, res: Response) => {
    const indicator = await indicatorService.getIndicatorById(
      Number(req.params.id),
      true,
    );

    const frequency =
      (req.query.frequency as "DAILY" | "WEEKLY" | "MONTHLY") || "MONTHLY";
    const submissions = (indicator as any).submissions || [];
    const gaps = indicatorService.detectReportingGaps(submissions, frequency);

    res.json({
      indicatorId: indicator.id,
      frequency,
      totalSubmissions: submissions.length,
      gaps,
    });
  },
);

export const getCategoryDistribution = asyncHandler(
  async (req: Request, res: Response) => {
    const indicatorWithStats = await indicatorService.getIndicatorWithStats(
      Number(req.params.id),
    );

    if (indicatorWithStats.dataType !== "CATEGORICAL") {
      res.status(400).json({
        error: {
          code: "NOT_CATEGORICAL",
          message: "This endpoint only works with CATEGORICAL indicators",
        },
      });
      return;
    }

    res.json({
      indicatorId: indicatorWithStats.id,
      indicatorName: indicatorWithStats.name,
      categories: indicatorWithStats.categories,
      distribution:
        (indicatorWithStats.stats as any)?.categoryDistribution || [],
      mostFrequent: (indicatorWithStats.stats as any)?.mostFrequent || null,
      totalSubmissions: (indicatorWithStats.stats as any)?.submissionCount || 0,
    });
  },
);

export const deleteIndicator = asyncHandler(
  async (req: Request, res: Response) => {
    await indicatorService.deleteIndicator(Number(req.params.id));
    res.status(204).send();
  },
);

export const getIndicatorTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const templates = await indicatorService.getIndicatorTemplates(
      Number(req.params.id),
    );
    res.json(templates);
  },
);

export const getDisaggregatedCategoryStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await indicatorService.getDisaggregatedCategoryStats(
      Number(req.params.id),
    );
    res.json(stats);
  },
);
export const getReportingCompliance = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate, reportingFrequency } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          code: "MISSING_DATES",
          message: "startDate and endDate are required",
        },
      });
      return;
    }

    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
    const frequency = (reportingFrequency as string)?.toUpperCase() || 'MONTHLY';
    
    if (!validFrequencies.includes(frequency)) {
      res.status(400).json({
        error: {
          code: "INVALID_FREQUENCY",
          message: `reportingFrequency must be one of: ${validFrequencies.join(', ')}`,
        },
      });
      return;
    }

    const compliance = await indicatorService.getReportingCompliance(
      Number(req.params.id),
      new Date(startDate as string),
      new Date(endDate as string),
      frequency as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    );
    res.json(compliance);
  }
);

export const getCategoryTimeSeries = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate, groupBy } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          code: "MISSING_DATES",
          message: "startDate and endDate are required",
        },
      });
      return;
    }

    const validGroupBy = ['day', 'week', 'month', 'quarter', 'year'];
    const group = (groupBy as string) || 'month';
    
    if (!validGroupBy.includes(group)) {
      res.status(400).json({
        error: {
          code: "INVALID_GROUP_BY",
          message: `groupBy must be one of: ${validGroupBy.join(', ')}`,
        },
      });
      return;
    }

    const timeSeries = await indicatorService.getCategoryTimeSeriesStats(
      Number(req.params.id),
      new Date(startDate as string),
      new Date(endDate as string),
      group as 'day' | 'week' | 'month' | 'quarter' | 'year'
    );
    res.json(timeSeries);
  }
);