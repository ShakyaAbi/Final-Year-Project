import { prisma } from '../prisma';

export const createSubmission = (data: {
  indicatorId: number;
  reportedAt: Date;
  value: string;
  evidence?: string | null;
  createdByUserId: number;
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
