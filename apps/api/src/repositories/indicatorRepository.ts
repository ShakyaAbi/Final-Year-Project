import { IndicatorDataType } from '@prisma/client';
import { prisma } from '../prisma';

export const createIndicator = (data: {
  projectId: number;
  logframeNodeId: number;
  name: string;
  unit: string;
  baselineValue: number | null;
  targetValue: number | null;
  dataType: IndicatorDataType;
  minValue: number | null;
  maxValue: number | null;
}) => prisma.indicator.create({ data });

export const getIndicatorsByProject = (projectId: number) =>
  prisma.indicator.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });

export const getById = (id: number) => prisma.indicator.findUnique({ where: { id } });

export const getByIdWithSubmissions = (id: number) =>
  prisma.indicator.findUnique({
    where: { id },
    include: { submissions: { orderBy: { reportedAt: 'desc' } } }
  });

export const updateIndicator = (
  id: number,
  data: Partial<{
    projectId: number;
    logframeNodeId: number;
    name: string;
    unit: string;
    baselineValue: number | null;
    targetValue: number | null;
    dataType: IndicatorDataType;
    minValue: number | null;
    maxValue: number | null;
  }>
) => prisma.indicator.update({ where: { id }, data });
