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
  anomalyConfig?: Record<string, any> | null;
  categories?: any[] | null;
  categoryConfig?: Record<string, any> | null;
}) => prisma.indicator.create({ data: {
  ...data,
  anomalyConfig: data.anomalyConfig as any,
  categories: data.categories as any,
  categoryConfig: data.categoryConfig as any
} });

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
    anomalyConfig: Record<string, any> | null;
    categories: any[] | null;
    categoryConfig: Record<string, any> | null;
  }>
) => prisma.indicator.update({ where: { id }, data: {
  ...data,
  anomalyConfig: data.anomalyConfig !== undefined ? (data.anomalyConfig as any) : undefined,
  categories: data.categories !== undefined ? (data.categories as any) : undefined,
  categoryConfig: data.categoryConfig !== undefined ? (data.categoryConfig as any) : undefined
} });
