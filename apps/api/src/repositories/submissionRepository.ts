import { prisma } from "../prisma";
import { AnomalyStatus } from "@prisma/client";

export const createSubmission = (data: {
  indicatorId: number;
  reportedAt: Date;
  value: string;
  categoryValue?: string | null;
  disaggregationKey?: string | null;
  evidence?: string | null;
  createdByUserId: number;
  isAnomaly?: boolean;
  anomalyReason?: string | null;
  anomalyStatus?: AnomalyStatus | null;
  anomalyScore?: number | null;
  anomalyThreshold?: number | null;
  anomalyMethod?: string | null;
  anomalyMeta?: Record<string, any> | null;
}) => prisma.submission.create({ data });

export const listSubmissions = (
  indicatorId: number,
  filters: { from?: Date | null; to?: Date | null; includeDeleted?: boolean },
) =>
  prisma.submission.findMany({
    where: {
      indicatorId,
      reportedAt: {
        gte: filters.from ?? undefined,
        lte: filters.to ?? undefined,
      },
      deletedAt: filters.includeDeleted ? undefined : null,
    } as any,
    orderBy: { reportedAt: "desc" },
  });

export const getById = (id: number) =>
  prisma.submission.findUnique({
    where: { id },
    include: { indicator: true },
  });

export const getRecentSubmissions = (indicatorId: number, limit: number) =>
  prisma.submission.findMany({
    where: { indicatorId, deletedAt: null } as any,
    orderBy: { reportedAt: "desc" },
    take: limit,
  });

export const updateSubmission = (
  id: number,
  data: Partial<{
    anomalyStatus: AnomalyStatus;
    anomalyReviewedBy: number;
    anomalyReviewedAt: Date;
    anomalyReason: string;
    anomalyScore: number | null;
    anomalyThreshold: number | null;
    anomalyMethod: string | null;
    anomalyMeta: Record<string, any> | null;
  }>,
) => prisma.submission.update({ where: { id }, data });

export const updateSubmissionData = (
  id: number,
  data: {
    reportedAt: Date;
    value: string;
    categoryValue?: string | null;
    disaggregationKey?: string | null;
    evidence?: string | null;
    updatedByUserId: number;
    isAnomaly?: boolean;
    anomalyReason?: string | null;
    anomalyStatus?: AnomalyStatus | null;
    anomalyScore?: number | null;
    anomalyThreshold?: number | null;
    anomalyMethod?: string | null;
    anomalyMeta?: Record<string, any> | null;
  },
) => prisma.submission.update({ where: { id }, data: data as any });

export const softDeleteSubmission = (id: number, userId: number) =>
  prisma.submission.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedByUserId: userId,
      updatedByUserId: userId,
    } as any,
  });

export const restoreSubmission = (id: number, userId: number) =>
  prisma.submission.update({
    where: { id },
    data: {
      deletedAt: null,
      deletedByUserId: null,
      updatedByUserId: userId,
    } as any,
  });
