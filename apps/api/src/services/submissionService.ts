import { IndicatorDataType, AnomalyStatus } from '@prisma/client';
import * as indicatorRepo from '../repositories/indicatorRepository';
import * as submissionRepo from '../repositories/submissionRepository';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { validateCategoricalValue, formatCategoricalValue, CategoryDefinition, CategoryConfig } from './categoricalService';

type AnomalyConfig = {
  enabled?: boolean;
  outlier?: {
    method?: 'MAD' | 'IQR';
    threshold?: number;
    windowSize?: number;
    minPoints?: number;
  };
  trend?: {
    method?: 'SLOPE_SHIFT' | 'MEAN_SHIFT';
    threshold?: number;
    windowSize?: number;
  };
};

const defaultAnomalyConfig: Required<Pick<AnomalyConfig, 'enabled'>> & AnomalyConfig = {
  enabled: false,
  outlier: { method: 'MAD', threshold: 3.5, windowSize: 8, minPoints: 6 },
  trend: { method: 'SLOPE_SHIFT', threshold: 2, windowSize: 6 }
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError('INVALID_DATE', 'Invalid date value');
  }
  return d;
};

const normalizeValue = (
  dataType: IndicatorDataType, 
  value: any, 
  min?: number | null, 
  max?: number | null,
  categories?: CategoryDefinition[] | null,
  categoryConfig?: CategoryConfig | null
) => {
  switch (dataType) {
    case 'NUMBER': {
      const num = Number(value);
      if (!Number.isFinite(num)) throw new BadRequestError('INVALID_VALUE', 'Value must be numeric');
      if (min !== null && min !== undefined && num < min) {
        throw new BadRequestError('VALUE_TOO_LOW', `Value must be >= ${min}`);
      }
      if (max !== null && max !== undefined && num > max) {
        throw new BadRequestError('VALUE_TOO_HIGH', `Value must be <= ${max}`);
      }
      return num.toString();
    }
    case 'PERCENT': {
      const num = Number(value);
      if (!Number.isFinite(num)) throw new BadRequestError('INVALID_VALUE', 'Value must be numeric');
      const lower = min ?? 0;
      const upper = max ?? 100;
      if (num < lower || num > upper) {
        throw new BadRequestError('VALUE_OUT_OF_RANGE', `Percent must be between ${lower} and ${upper}`);
      }
      return num.toString();
    }
    case 'BOOLEAN': {
      if (typeof value === 'boolean') return value.toString();
      if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
        return value.toLowerCase();
      }
      throw new BadRequestError('INVALID_VALUE', 'Value must be boolean');
    }
    case 'TEXT': {
      if (value === undefined || value === null) {
        throw new BadRequestError('INVALID_VALUE', 'Value cannot be empty');
      }
      return String(value);
    }
    case 'CATEGORICAL': {
      if (!categories || categories.length === 0) {
        throw new BadRequestError('NO_CATEGORIES', 'Indicator has no categories defined');
      }
      const config = categoryConfig || {};
      const selectedIds = validateCategoricalValue(String(value), categories, config);
      return formatCategoricalValue(selectedIds);
    }
    default:
      throw new BadRequestError('INVALID_VALUE', 'Unsupported data type');
  }
};

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const quantile = (values: number[], q: number) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
};

const slope = (values: number[]) => {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
};

const assessRangeAnomaly = (dataType: IndicatorDataType, value: string, min?: number | null, max?: number | null) => {
  if (dataType === 'NUMBER') {
    const num = Number(value);
    if (!Number.isFinite(num)) return { isAnomaly: false };
    if (min !== null && min !== undefined && num < min) {
      return { isAnomaly: true, anomalyReason: `Value below expected minimum (${min})` };
    }
    if (max !== null && max !== undefined && num > max) {
      return { isAnomaly: true, anomalyReason: `Value exceeds expected maximum (${max})` };
    }
    return { isAnomaly: false };
  }
  if (dataType === 'PERCENT') {
    const num = Number(value);
    if (!Number.isFinite(num)) return { isAnomaly: false };
    const lower = min ?? 0;
    const upper = max ?? 100;
    if (num < lower || num > upper) {
      return { isAnomaly: true, anomalyReason: `Percent must be between ${lower} and ${upper}` };
    }
    return { isAnomaly: false };
  }
  return { isAnomaly: false };
};

const assessSeriesAnomalies = (
  dataType: IndicatorDataType,
  submissions: { value: string }[],
  anomalyConfig?: AnomalyConfig | null,
  min?: number | null,
  max?: number | null
) => {
  const config = { ...defaultAnomalyConfig, ...(anomalyConfig ?? {}) };
  if (!config.enabled) {
    return submissions.map((submission) => assessRangeAnomaly(dataType, submission.value, min, max));
  }

  const numericValues = submissions.map((s) => Number(s.value));
  const results = submissions.map(() => ({ isAnomaly: false, anomalyReason: undefined as string | undefined }));

  for (let i = 0; i < submissions.length; i++) {
    const num = numericValues[i];
    if (!Number.isFinite(num)) continue;

    const reasons: string[] = [];

    if (config.outlier) {
      const method = config.outlier.method ?? 'MAD';
      const windowSize = Math.max(2, config.outlier.windowSize ?? 8);
      const minPoints = Math.max(2, config.outlier.minPoints ?? windowSize);
      const window = numericValues.slice(Math.max(0, i - windowSize), i).filter(Number.isFinite);
      if (window.length >= minPoints) {
        if (method === 'MAD') {
          const med = median(window);
          if (med !== null) {
            const deviations = window.map((v) => Math.abs(v - med));
            const mad = median(deviations);
            if (mad && mad > 0) {
              const modifiedZ = 0.6745 * (num - med) / mad;
              if (Math.abs(modifiedZ) >= (config.outlier.threshold ?? 3.5)) {
                reasons.push(`Outlier (MAD ≥ ${config.outlier.threshold ?? 3.5})`);
              }
            }
          }
        }
        if (method === 'IQR') {
          const q1 = quantile(window, 0.25);
          const q3 = quantile(window, 0.75);
          if (q1 !== null && q3 !== null) {
            const iqr = q3 - q1;
            if (iqr > 0) {
              const threshold = config.outlier.threshold ?? 1.5;
              const lower = q1 - threshold * iqr;
              const upper = q3 + threshold * iqr;
              if (num < lower || num > upper) {
                reasons.push(`Outlier (IQR ≥ ${threshold})`);
              }
            }
          }
        }
      }
    }

    if (config.trend) {
      const method = config.trend.method ?? 'SLOPE_SHIFT';
      const windowSize = Math.max(3, config.trend.windowSize ?? 6);
      if (i >= windowSize * 2 - 1) {
        const currentWindow = numericValues.slice(i - windowSize + 1, i + 1);
        const previousWindow = numericValues.slice(i - windowSize * 2 + 1, i - windowSize + 1);
        if (currentWindow.every(Number.isFinite) && previousWindow.every(Number.isFinite)) {
          if (method === 'SLOPE_SHIFT') {
            const prevSlope = slope(previousWindow);
            const currSlope = slope(currentWindow);
            if (prevSlope !== null && currSlope !== null) {
              const denom = Math.abs(prevSlope) + 1e-6;
              const ratio = Math.abs(currSlope - prevSlope) / denom;
              if (ratio >= (config.trend.threshold ?? 2)) {
                reasons.push(`Trend shift (slope change ≥ ${config.trend.threshold ?? 2}x)`);
              }
            }
          }
          if (method === 'MEAN_SHIFT') {
            const mean =
              previousWindow.reduce((sum, v) => sum + v, 0) / Math.max(1, previousWindow.length);
            const threshold = config.trend.threshold ?? 0.3;
            const diff = Math.abs(num - mean);
            const ratio = mean === 0 ? diff : diff / Math.abs(mean);
            if (ratio >= threshold) {
              reasons.push(`Trend shift (mean change ≥ ${threshold * 100}%)`);
            }
          }
        }
      }
    }

    if (reasons.length > 0) {
      results[i] = { isAnomaly: true, anomalyReason: reasons.join(' | ') };
    }
  }

  return results;
};

const detectAnomalyForNewValue = (
  newValue: string,
  dataType: IndicatorDataType,
  recentSubmissions: { value: string; reportedAt: Date }[],
  indicator: { 
    minValue: number | null; 
    maxValue: number | null; 
    anomalyConfig: any;
  }
): { isAnomaly: boolean; anomalyReason?: string } => {
  const config = { ...defaultAnomalyConfig, ...(indicator.anomalyConfig ?? {}) };
  
  if (!config.enabled) {
    return assessRangeAnomaly(dataType, newValue, indicator.minValue, indicator.maxValue);
  }

  const allValues = [...recentSubmissions.map(s => s.value), newValue];
  const assessments = assessSeriesAnomalies(
    dataType,
    allValues.map(value => ({ value })),
    config,
    indicator.minValue,
    indicator.maxValue
  );

  const lastAssessment = assessments[assessments.length - 1];
  return {
    isAnomaly: lastAssessment.isAnomaly,
    anomalyReason: lastAssessment.anomalyReason
  };
};

export const createSubmission = async (
  indicatorId: number,
  data: { reportedAt: string; value: any; evidence?: string | null },
  userId: number
) => {
  const indicator = await indicatorRepo.getById(indicatorId);
  if (!indicator) throw new NotFoundError('INDICATOR_NOT_FOUND', 'Indicator not found');

  const reportedAt = parseDate(data.reportedAt);
  
  // Extract categories and categoryConfig for validation
  const categories = indicator.categories as any as CategoryDefinition[] | null;
  const categoryConfig = indicator.categoryConfig as any as CategoryConfig | null;
  
  const normalizedValue = normalizeValue(
    indicator.dataType, 
    data.value, 
    indicator.minValue, 
    indicator.maxValue,
    categories,
    categoryConfig
  );

  // Get recent submissions for anomaly detection context
  const config = { ...defaultAnomalyConfig, ...(indicator.anomalyConfig as any ?? {}) };
  const windowSize = Math.max(
    config.outlier?.windowSize ?? 8,
    (config.trend?.windowSize ?? 6) * 2
  );
  
  const recentSubmissions = await submissionRepo.getRecentSubmissions(indicatorId, windowSize);
  
  // Detect anomaly for this new value
  const anomalyResult = detectAnomalyForNewValue(
    normalizedValue,
    indicator.dataType,
    recentSubmissions,
    indicator
  );

  return submissionRepo.createSubmission({
    indicatorId,
    reportedAt: reportedAt!,
    value: normalizedValue,
    evidence: data.evidence ?? null,
    createdByUserId: userId,
    isAnomaly: anomalyResult.isAnomaly,
    anomalyReason: anomalyResult.anomalyReason ?? null,
    anomalyStatus: anomalyResult.isAnomaly ? AnomalyStatus.DETECTED : null
  });
};

export const listSubmissions = async (
  indicatorId: number,
  query: { from?: string; to?: string }
) => {
  const indicator = await indicatorRepo.getById(indicatorId);
  if (!indicator) throw new NotFoundError('INDICATOR_NOT_FOUND', 'Indicator not found');

  const from = query.from ? parseDate(query.from) : undefined;
  const to = query.to ? parseDate(query.to) : undefined;

  const submissions = await submissionRepo.listSubmissions(indicatorId, { from, to });

  // Return submissions with persisted anomaly data
  return submissions.map(submission => ({
    id: submission.id,
    indicatorId: submission.indicatorId,
    reportedAt: submission.reportedAt,
    value: submission.value,
    evidence: submission.evidence,
    createdByUserId: submission.createdByUserId,
    createdAt: submission.createdAt,
    isAnomaly: submission.isAnomaly,
    anomalyReason: submission.anomalyReason,
    anomalyStatus: submission.anomalyStatus,
    anomalyReviewedBy: submission.anomalyReviewedBy,
    anomalyReviewedAt: submission.anomalyReviewedAt
  }));
};

export const acknowledgeAnomaly = async (
  submissionId: number,
  userId: number,
  notes?: string
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission) throw new NotFoundError('SUBMISSION_NOT_FOUND', 'Submission not found');
  if (!submission.isAnomaly) {
    throw new BadRequestError('NOT_ANOMALY', 'Submission is not flagged as anomaly');
  }

  return submissionRepo.updateSubmission(submissionId, {
    anomalyStatus: AnomalyStatus.ACKNOWLEDGED,
    anomalyReviewedBy: userId,
    anomalyReviewedAt: new Date(),
    anomalyReason: notes || submission.anomalyReason || undefined
  });
};

export const resolveAnomaly = async (
  submissionId: number,
  userId: number,
  notes?: string
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission) throw new NotFoundError('SUBMISSION_NOT_FOUND', 'Submission not found');
  if (!submission.isAnomaly) {
    throw new BadRequestError('NOT_ANOMALY', 'Submission is not flagged as anomaly');
  }

  return submissionRepo.updateSubmission(submissionId, {
    anomalyStatus: AnomalyStatus.RESOLVED,
    anomalyReviewedBy: userId,
    anomalyReviewedAt: new Date(),
    anomalyReason: notes || submission.anomalyReason || undefined
  });
};

export const markAnomalyFalsePositive = async (
  submissionId: number,
  userId: number,
  notes?: string
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission) throw new NotFoundError('SUBMISSION_NOT_FOUND', 'Submission not found');
  if (!submission.isAnomaly) {
    throw new BadRequestError('NOT_ANOMALY', 'Submission is not flagged as anomaly');
  }

  return submissionRepo.updateSubmission(submissionId, {
    anomalyStatus: AnomalyStatus.FALSE_POSITIVE,
    anomalyReviewedBy: userId,
    anomalyReviewedAt: new Date(),
    anomalyReason: notes || submission.anomalyReason || undefined
  });
};

export const updateAnomalyStatus = async (
  submissionId: number,
  status: AnomalyStatus,
  userId: number,
  notes?: string
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission) throw new NotFoundError('SUBMISSION_NOT_FOUND', 'Submission not found');
  if (!submission.isAnomaly) {
    throw new BadRequestError('NOT_ANOMALY', 'Submission is not flagged as anomaly');
  }

  return submissionRepo.updateSubmission(submissionId, {
    anomalyStatus: status,
    anomalyReviewedBy: userId,
    anomalyReviewedAt: new Date(),
    anomalyReason: notes || submission.anomalyReason || undefined
  });
};
