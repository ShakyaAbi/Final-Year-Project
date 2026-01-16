import { prisma } from '../prisma';
import { AnomalyStatus } from '@prisma/client';

export const createSubmission = (data: {
  indicatorId: number;
  reportedAt: Date;
  value: string;
  evidence?: string | null;
  createdByUserId: number;
  isAnomaly?: boolean;
  anomalyReason?: string | null;
  anomalyStatus?: AnomalyStatus | null;
}) => prisma.submission.create({ data });

export const listSubmissions = (
  indicatorId: number,
  filters: { from?: Date | null; to?: Date | null }
) =>
  prisma.submission.findMany({
    where: {
      indicatorId,
      reportedAt: {
        gte: filters.from ?? undefined,
        lte: filters.to ?? undefined
      }
    },
    orderBy: { reportedAt: 'desc' }
  });

export const getById = (id: number) => 
  prisma.submission.findUnique({ 
    where: { id },
    include: { indicator: true }
  });

export const getRecentSubmissions = (
  indicatorId: number,
  limit: number
) =>
  prisma.submission.findMany({
    where: { indicatorId },
    orderBy: { reportedAt: 'desc' },
    take: limit
  });

export const updateSubmission = (
  id: number,
  data: Partial<{
    anomalyStatus: AnomalyStatus;
    anomalyReviewedBy: number;
    anomalyReviewedAt: Date;
    anomalyReason: string;
  }>
) => prisma.submission.update({ where: { id }, data });
