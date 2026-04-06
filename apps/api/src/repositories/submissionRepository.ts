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
}) => prisma.submission.create({ data: data as any });

export const listSubmissions = (
  indicatorId: number,
  organizationId: number,
  filters: { from?: Date | null; to?: Date | null; includeDeleted?: boolean },
) =>
  prisma.submission.findMany({
    where: {
      indicatorId,
      indicator: { project: { organizationId } },
      reportedAt: {
        gte: filters.from ?? undefined,
        lte: filters.to ?? undefined,
      },
      deletedAt: filters.includeDeleted ? undefined : null,
    } as any,
    orderBy: { reportedAt: "desc" },
  });

export const getById = (id: number, organizationId: number) =>
  prisma.submission.findFirst({
    where: { id, indicator: { project: { organizationId } } },
    include: { indicator: true },
  });

export const getRecentSubmissions = (indicatorId: number, organizationId: number, limit: number) =>
  prisma.submission.findMany({
    where: { 
      indicatorId, 
      indicator: { project: { organizationId } },
      deletedAt: null 
    } as any,
    orderBy: { reportedAt: "desc" },
    take: limit,
  });

export const updateAnomalyFieldsByIndicator = (
  indicatorId: number,
  organizationId: number,
  data: Partial<{
    isAnomaly: boolean;
    anomalyReason: string | null;
    anomalyStatus: AnomalyStatus | null;
    anomalyScore: number | null;
    anomalyThreshold: number | null;
    anomalyMethod: string | null;
    anomalyMeta: Record<string, any> | null;
  }>,
) =>
  prisma.submission.updateMany({
    where: {
      indicatorId,
      indicator: { project: { organizationId } },
    } as any,
    data: data as any,
  });

export const updateSubmission = (
  id: number,
  organizationId: number,
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
) => prisma.submission.update({ where: { id, indicator: { project: { organizationId } } }, data: data as any });

export const updateSubmissionData = (
  id: number,
  organizationId: number,
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
) => prisma.submission.update({ where: { id, indicator: { project: { organizationId } } }, data: data as any });

export const softDeleteSubmission = (id: number, organizationId: number, userId: number) =>
  prisma.submission.update({
    where: { id, indicator: { project: { organizationId } } },
    data: {
      deletedAt: new Date(),
      deletedByUserId: userId,
      updatedByUserId: userId,
    } as any,
  });

export const restoreSubmission = (id: number, organizationId: number, userId: number) =>
  prisma.submission.update({
    where: { id, indicator: { project: { organizationId } } },
    data: {
      deletedAt: null,
      deletedByUserId: null,
      updatedByUserId: userId,
    } as any,
  });

export const findUniqueSubmission = (
  indicatorId: number,
  organizationId: number,
  reportedAt: Date,
  disaggregationKey: string | null,
) =>
  prisma.submission.findFirst({
    where: {
      indicatorId,
      indicator: { project: { organizationId } },
      reportedAt,
      disaggregationKey: disaggregationKey || null,
      deletedAt: null,
    } as any,
  });

