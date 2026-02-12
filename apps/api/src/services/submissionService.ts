import { IndicatorDataType, AnomalyStatus, Role } from "@prisma/client";
import * as indicatorRepo from "../repositories/indicatorRepository";
import * as submissionRepo from "../repositories/submissionRepository";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";
import { scoreSubmission, ScoreResult } from "./mlService";
import {
  AnomalyConfig,
  normalizeAnomalyConfig,
} from "./anomalyConfig";
import {
  validateCategoricalValue,
  formatCategoricalValue,
  validateDisaggregationKey,
  CategoryDefinition,
  CategoryConfig,
} from "./categoricalService";


const parseDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError("INVALID_DATE", "Invalid date value");
  }
  return d;
};

const normalizeValue = (
  dataType: IndicatorDataType,
  value: any,
  min?: number | null,
  max?: number | null,
  categories?: CategoryDefinition[] | null,
  categoryConfig?: CategoryConfig | null,
) => {
  switch (dataType) {
    case "NUMBER": {
      const num = Number(value);
      if (!Number.isFinite(num))
        throw new BadRequestError("INVALID_VALUE", "Value must be numeric");
      return num.toString();
    }
    case "PERCENT": {
      const num = Number(value);
      if (!Number.isFinite(num))
        throw new BadRequestError("INVALID_VALUE", "Value must be numeric");
      const lower = min ?? 0;
      const upper = max ?? 100;
      if (num < lower || num > upper) {
        throw new BadRequestError(
          "VALUE_OUT_OF_RANGE",
          `Percent must be between ${lower} and ${upper}`,
        );
      }
      return num.toString();
    }
    case "BOOLEAN": {
      if (typeof value === "boolean") return value.toString();
      if (
        typeof value === "string" &&
        ["true", "false"].includes(value.toLowerCase())
      ) {
        return value.toLowerCase();
      }
      throw new BadRequestError("INVALID_VALUE", "Value must be boolean");
    }
    case "TEXT": {
      if (value === undefined || value === null) {
        throw new BadRequestError("INVALID_VALUE", "Value cannot be empty");
      }
      return String(value);
    }
    case "CATEGORICAL": {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new BadRequestError("INVALID_VALUE", "Value must be numeric");
      }
      return num.toString();
    }
    default:
      throw new BadRequestError("INVALID_VALUE", "Unsupported data type");
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

const assessRangeAnomaly = (
  dataType: IndicatorDataType,
  value: string,
  min?: number | null,
  max?: number | null,
) => {
  if (dataType === "NUMBER" || dataType === "CATEGORICAL") {
    const num = Number(value);
    if (!Number.isFinite(num)) return { isAnomaly: false };
    if (min !== null && min !== undefined && num < min) {
      return {
        isAnomaly: true,
        anomalyReason: `Value below expected minimum (${min})`,
      };
    }
    if (max !== null && max !== undefined && num > max) {
      return {
        isAnomaly: true,
        anomalyReason: `Value exceeds expected maximum (${max})`,
      };
    }
    return { isAnomaly: false };
  }
  if (dataType === "PERCENT") {
    const num = Number(value);
    if (!Number.isFinite(num)) return { isAnomaly: false };
    const lower = min ?? 0;
    const upper = max ?? 100;
    if (num < lower || num > upper) {
      return {
        isAnomaly: true,
        anomalyReason: `Percent must be between ${lower} and ${upper}`,
      };
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
  max?: number | null,
) => {
  const config = normalizeAnomalyConfig(anomalyConfig ?? null);
  if (!config.enabled) {
    return submissions.map((submission) =>
      assessRangeAnomaly(dataType, submission.value, min, max),
    );
  }

  const numericValues = submissions.map((s) => Number(s.value));
  const results = submissions.map(() => ({
    isAnomaly: false,
    anomalyReason: undefined as string | undefined,
  }));

  for (let i = 0; i < submissions.length; i++) {
    const num = numericValues[i];
    if (!Number.isFinite(num)) continue;

    const reasons: string[] = [];

    if (config.outlier) {
      const method = config.outlier.method ?? "MAD";
      const windowSize = Math.max(2, config.outlier.windowSize ?? 8);
      const minPoints = Math.max(2, config.outlier.minPoints ?? windowSize);
      const window = numericValues
        .slice(Math.max(0, i - windowSize), i)
        .filter(Number.isFinite);
      if (window.length >= minPoints) {
        if (method === "MAD") {
          const med = median(window);
          if (med !== null) {
            const deviations = window.map((v) => Math.abs(v - med));
            const mad = median(deviations);
            if (mad && mad > 0) {
              const modifiedZ = (0.6745 * (num - med)) / mad;
              if (Math.abs(modifiedZ) >= (config.outlier.threshold ?? 3.5)) {
                reasons.push(
                  `Outlier (MAD ≥ ${config.outlier.threshold ?? 3.5})`,
                );
              }
            }
          }
        }
        if (method === "IQR") {
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
      const method = config.trend.method ?? "SLOPE_SHIFT";
      const windowSize = Math.max(3, config.trend.windowSize ?? 6);
      if (i >= windowSize * 2 - 1) {
        const currentWindow = numericValues.slice(i - windowSize + 1, i + 1);
        const previousWindow = numericValues.slice(
          i - windowSize * 2 + 1,
          i - windowSize + 1,
        );
        if (
          currentWindow.every(Number.isFinite) &&
          previousWindow.every(Number.isFinite)
        ) {
          if (method === "SLOPE_SHIFT") {
            const prevSlope = slope(previousWindow);
            const currSlope = slope(currentWindow);
            if (prevSlope !== null && currSlope !== null) {
              const denom = Math.max(
                Math.abs(prevSlope),
                Math.abs(currSlope),
                1e-6,
              );
              const ratio = Math.abs(currSlope - prevSlope) / denom;
              if (ratio >= (config.trend.threshold ?? 2)) {
                reasons.push(
                  `Trend shift (slope change ≥ ${config.trend.threshold ?? 2}x)`,
                );
              }
            }
          }
          if (method === "MEAN_SHIFT") {
            const mean =
              previousWindow.reduce((sum, v) => sum + v, 0) /
              Math.max(1, previousWindow.length);
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
      results[i] = { isAnomaly: true, anomalyReason: reasons.join(" | ") };
    }
  }

  return results;
};

const detectRulesAnomalyForNewValue = (
  newValue: string,
  dataType: IndicatorDataType,
  recentSubmissions: { value: string; reportedAt: Date }[],
  indicator: {
    minValue: number | null;
    maxValue: number | null;
    anomalyConfig: any;
  },
  config: AnomalyConfig,
): { isAnomaly: boolean; anomalyReason?: string } => {
  if (!config.enabled) {
    return { isAnomaly: false };
  }

  const reasons: string[] = [];
  const rules = config.rules ?? {};

  if (rules.range !== false) {
    const rangeResult = assessRangeAnomaly(
      dataType,
      newValue,
      indicator.minValue,
      indicator.maxValue,
    );
    if (rangeResult.isAnomaly && rangeResult.anomalyReason) {
      reasons.push(rangeResult.anomalyReason);
    }
  }

  const maxChangePercent = rules.maxChangePercent ?? 50;
  const numericValue = Number(newValue);
  if (Number.isFinite(numericValue) && maxChangePercent > 0) {
    const previous = [...recentSubmissions]
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
      .map((s) => Number(s.value))
      .find((v) => Number.isFinite(v));
    if (previous !== undefined) {
      if (previous === 0) {
        if (numericValue !== 0) {
          reasons.push("Large change from 0");
        }
      } else {
        const percentChange =
          (Math.abs(numericValue - previous) / Math.abs(previous)) * 100;
        if (percentChange >= maxChangePercent) {
          reasons.push(`Change > ${maxChangePercent}% from previous value`);
        }
      }
    }
  }

  if (reasons.length > 0) {
    return { isAnomaly: true, anomalyReason: reasons.join(" | ") };
  }
  return { isAnomaly: false };
};

const isNumericDataType = (dataType: IndicatorDataType) =>
  dataType === "NUMBER" ||
  dataType === "PERCENT" ||
  dataType === "CATEGORICAL";

const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const ensureCanModifySubmission = (
  submission: {
    createdAt: Date;
    createdByUserId: number;
  },
  userId: number,
  role: Role,
) => {
  if (role === "ADMIN" || role === "MANAGER") return;
  if (role !== "DATA_ENTRY") {
    throw new ForbiddenError("You are not allowed to modify this submission");
  }
  if (submission.createdByUserId !== userId) {
    throw new ForbiddenError("You can only modify your own submissions");
  }
  const ageMs = Date.now() - submission.createdAt.getTime();
  if (ageMs > EDIT_WINDOW_MS) {
    throw new ForbiddenError("Submission can only be modified within 7 days");
  }
};

const toSubmissionConflictError = () =>
  new BadRequestError(
    "SUBMISSION_CONFLICT",
    "Another submission exists for this date/disaggregation",
  );

const scoreWithMl = async (
  indicatorId: number,
  dataType: IndicatorDataType,
  values: number[],
  newValue: number,
  config: AnomalyConfig,
): Promise<ScoreResult> => {
  return scoreSubmission({
    indicatorId,
    dataType,
    values,
    newValue,
    config: {
      method: config.ml?.method ?? "ISOLATION_FOREST",
      contamination: config.ml?.contamination ?? 0.05,
      windowSize: config.ml?.windowSize ?? 50,
      minPoints: config.ml?.minPoints ?? 20,
      seed: config.ml?.seed ?? 42,
    },
  });
};

export const createSubmission = async (
  indicatorId: number,
  data: {
    reportedAt: string;
    value: any;
    categoryValue?: string | null;
    disaggregationKey?: string | null;
    evidence?: string | null;
  },
  userId: number,
) => {
  const indicator = await indicatorRepo.getById(indicatorId);
  if (!indicator)
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");

  const reportedAt = parseDate(data.reportedAt);

  // Extract categories and categoryConfig for validation
  const categories = indicator.categories as any as CategoryDefinition[] | null;
  const categoryConfig =
    indicator.categoryConfig as any as CategoryConfig | null;

  // Validate disaggregation key if provided or required
  if (indicator.dataType === "CATEGORICAL") {
    validateDisaggregationKey(data.disaggregationKey, categoryConfig);
  }

  let normalizedCategoryValue: string | null = null;
  if (categories && categories.length > 0) {
    const config = categoryConfig || { required: false };
    const rawCategoryValue =
      data.categoryValue ?? (indicator.dataType === "CATEGORICAL" ? "" : null);
    const shouldValidate =
      indicator.dataType === "CATEGORICAL" ||
      config.required === true ||
      (rawCategoryValue !== null && rawCategoryValue !== undefined);

    if (shouldValidate) {
      const selectedIds = validateCategoricalValue(
        String(rawCategoryValue ?? ""),
        categories,
        config,
      );
      normalizedCategoryValue =
        selectedIds.length > 0 ? formatCategoricalValue(selectedIds) : null;
    }
  } else if (indicator.dataType === "CATEGORICAL") {
    throw new BadRequestError(
      "NO_CATEGORIES",
      "Indicator has no categories defined",
    );
  }

  // Normalize value - always required, including for CATEGORICAL (numeric)
  const normalizedValue = normalizeValue(
    indicator.dataType,
    data.value,
    indicator.minValue,
    indicator.maxValue,
    categories,
    categoryConfig,
  );

  // Get recent submissions for anomaly detection context
  const config = normalizeAnomalyConfig(
    (indicator.anomalyConfig as any) ?? null,
  );
  const ruleWindowSize = Math.max(
    config.outlier?.windowSize ?? 8,
    (config.trend?.windowSize ?? 6) * 2,
  );
  const mlWindowSize = config.ml?.windowSize ?? 50;
  const windowSize = Math.max(ruleWindowSize, mlWindowSize);

  const recentSubmissions = await submissionRepo.getRecentSubmissions(
    indicatorId,
    windowSize,
  );
  const chronological = [...recentSubmissions].sort(
    (a, b) => a.reportedAt.getTime() - b.reportedAt.getTime(),
  );

  let anomalyResult: {
    isAnomaly: boolean;
    anomalyReason?: string;
    anomalyScore?: number | null;
    anomalyThreshold?: number | null;
    anomalyMethod?: string | null;
    anomalyMeta?: Record<string, any> | null;
  } = { isAnomaly: false };

  const shouldUseMl =
    config.enabled &&
    config.mode === "ML" &&
    isNumericDataType(indicator.dataType);

  if (shouldUseMl) {
    const numericValues = chronological
      .map((s) => Number(s.value))
      .filter(Number.isFinite);
    const newNumericValue = Number(normalizedValue);
    const minPoints = config.ml?.minPoints ?? 20;

    if (numericValues.length >= minPoints && Number.isFinite(newNumericValue)) {
      try {
        const result = await scoreWithMl(
          indicatorId,
          indicator.dataType,
          numericValues,
          newNumericValue,
          config,
        );
        anomalyResult = {
          isAnomaly: result.isAnomaly,
          anomalyReason: result.reason,
          anomalyScore: result.score,
          anomalyThreshold: result.threshold,
          anomalyMethod: result.method,
          anomalyMeta: result.meta,
        };
      } catch (error) {
        if (config.fallback?.useRulesOnServiceError !== false) {
          const ruleResult = detectRulesAnomalyForNewValue(
            normalizedValue,
            indicator.dataType,
            chronological,
            indicator,
            config,
          );
          anomalyResult = {
            isAnomaly: ruleResult.isAnomaly,
            anomalyReason: ruleResult.anomalyReason,
          };
        }
      }
    } else if (config.fallback?.useRulesWhenInsufficientData !== false) {
      const ruleResult = detectRulesAnomalyForNewValue(
        normalizedValue,
        indicator.dataType,
        chronological,
        indicator,
        config,
      );
      anomalyResult = {
        isAnomaly: ruleResult.isAnomaly,
        anomalyReason: ruleResult.anomalyReason ?? "Insufficient data",
      };
    }
  } else {
    const ruleResult = detectRulesAnomalyForNewValue(
      normalizedValue,
      indicator.dataType,
      chronological,
      indicator,
      config,
    );
    anomalyResult = {
      isAnomaly: ruleResult.isAnomaly,
      anomalyReason: ruleResult.anomalyReason,
    };
  }

  return submissionRepo.createSubmission({
    indicatorId,
    reportedAt: reportedAt!,
    value: normalizedValue,
    categoryValue: normalizedCategoryValue,
    disaggregationKey: data.disaggregationKey ?? null,
    evidence: data.evidence ?? null,
    createdByUserId: userId,
    isAnomaly: anomalyResult.isAnomaly,
    anomalyReason: anomalyResult.anomalyReason ?? null,
    anomalyStatus: anomalyResult.isAnomaly ? AnomalyStatus.DETECTED : null,
    anomalyScore: anomalyResult.anomalyScore ?? null,
    anomalyThreshold: anomalyResult.anomalyThreshold ?? null,
    anomalyMethod: anomalyResult.anomalyMethod ?? null,
    anomalyMeta: anomalyResult.anomalyMeta ?? null,
  });
};

export const listSubmissions = async (
  indicatorId: number,
  query: { from?: string; to?: string; includeDeleted?: string },
) => {
  const indicator = await indicatorRepo.getById(indicatorId);
  if (!indicator)
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");

  const from = query.from ? parseDate(query.from) : undefined;
  const to = query.to ? parseDate(query.to) : undefined;

  const submissions = await submissionRepo.listSubmissions(indicatorId, {
    from,
    to,
    includeDeleted: query.includeDeleted === "true",
  });

  // Return submissions with persisted anomaly data
  return submissions.map((submission) => ({
    id: submission.id,
    indicatorId: submission.indicatorId,
    reportedAt: submission.reportedAt,
    value: submission.value,
    categoryValue: submission.categoryValue,
    evidence: submission.evidence,
    createdByUserId: submission.createdByUserId,
    createdAt: submission.createdAt,
    isAnomaly: submission.isAnomaly,
    anomalyReason: submission.anomalyReason,
    anomalyStatus: submission.anomalyStatus,
    anomalyScore: submission.anomalyScore,
    anomalyThreshold: submission.anomalyThreshold,
    anomalyMethod: submission.anomalyMethod,
    anomalyMeta: submission.anomalyMeta as any,
    anomalyReviewedBy: submission.anomalyReviewedBy,
    anomalyReviewedAt: submission.anomalyReviewedAt,
    deletedAt: (submission as any).deletedAt,
    deletedByUserId: (submission as any).deletedByUserId,
    updatedAt: (submission as any).updatedAt,
    updatedByUserId: (submission as any).updatedByUserId,
  }));
};

export const updateSubmission = async (
  submissionId: number,
  data: {
    reportedAt: string;
    value: any;
    categoryValue?: string | null;
    disaggregationKey?: string | null;
    evidence?: string | null;
  },
  userId: number,
  role: Role,
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission) {
    throw new NotFoundError("SUBMISSION_NOT_FOUND", "Submission not found");
  }
  if ((submission as any).deletedAt) {
    throw new BadRequestError(
      "SUBMISSION_DELETED",
      "Deleted submissions must be restored before editing",
    );
  }
  ensureCanModifySubmission(submission, userId, role);

  const indicator = await indicatorRepo.getById(submission.indicatorId);
  if (!indicator) {
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");
  }

  const reportedAt = parseDate(data.reportedAt);

  const categories = indicator.categories as any as CategoryDefinition[] | null;
  const categoryConfig =
    indicator.categoryConfig as any as CategoryConfig | null;

  if (indicator.dataType === "CATEGORICAL") {
    validateDisaggregationKey(data.disaggregationKey, categoryConfig);
  }

  let normalizedCategoryValue: string | null = null;
  if (categories && categories.length > 0) {
    const config = categoryConfig || { required: false };
    const rawCategoryValue =
      data.categoryValue ?? (indicator.dataType === "CATEGORICAL" ? "" : null);
    const shouldValidate =
      indicator.dataType === "CATEGORICAL" ||
      config.required === true ||
      (rawCategoryValue !== null && rawCategoryValue !== undefined);

    if (shouldValidate) {
      const selectedIds = validateCategoricalValue(
        String(rawCategoryValue ?? ""),
        categories,
        config,
      );
      normalizedCategoryValue =
        selectedIds.length > 0 ? formatCategoricalValue(selectedIds) : null;
    }
  } else if (indicator.dataType === "CATEGORICAL") {
    throw new BadRequestError(
      "NO_CATEGORIES",
      "Indicator has no categories defined",
    );
  }

  const normalizedValue = normalizeValue(
    indicator.dataType,
    data.value,
    indicator.minValue,
    indicator.maxValue,
    categories,
    categoryConfig,
  );

  const config = normalizeAnomalyConfig(
    (indicator.anomalyConfig as any) ?? null,
  );
  const ruleWindowSize = Math.max(
    config.outlier?.windowSize ?? 8,
    (config.trend?.windowSize ?? 6) * 2,
  );
  const mlWindowSize = config.ml?.windowSize ?? 50;
  const windowSize = Math.max(ruleWindowSize, mlWindowSize);

  const recentSubmissions = await submissionRepo.getRecentSubmissions(
    indicator.id,
    windowSize + 1,
  );

  const chronological = [...recentSubmissions]
    .filter((s) => s.id !== submission.id)
    .sort((a, b) => a.reportedAt.getTime() - b.reportedAt.getTime());

  let anomalyResult: {
    isAnomaly: boolean;
    anomalyReason?: string;
    anomalyScore?: number | null;
    anomalyThreshold?: number | null;
    anomalyMethod?: string | null;
    anomalyMeta?: Record<string, any> | null;
  } = { isAnomaly: false };

  const shouldUseMl =
    config.enabled &&
    config.mode === "ML" &&
    isNumericDataType(indicator.dataType);

  if (shouldUseMl) {
    const numericValues = chronological
      .map((s) => Number(s.value))
      .filter(Number.isFinite);
    const newNumericValue = Number(normalizedValue);
    const minPoints = config.ml?.minPoints ?? 20;

    if (numericValues.length >= minPoints && Number.isFinite(newNumericValue)) {
      try {
        const result = await scoreWithMl(
          indicator.id,
          indicator.dataType,
          numericValues,
          newNumericValue,
          config,
        );
        anomalyResult = {
          isAnomaly: result.isAnomaly,
          anomalyReason: result.reason,
          anomalyScore: result.score,
          anomalyThreshold: result.threshold,
          anomalyMethod: result.method,
          anomalyMeta: result.meta,
        };
      } catch (_error) {
        if (config.fallback?.useRulesOnServiceError !== false) {
          const ruleResult = detectRulesAnomalyForNewValue(
            normalizedValue,
            indicator.dataType,
            chronological,
            indicator,
            config,
          );
          anomalyResult = {
            isAnomaly: ruleResult.isAnomaly,
            anomalyReason: ruleResult.anomalyReason,
          };
        }
      }
    } else if (config.fallback?.useRulesWhenInsufficientData !== false) {
      const ruleResult = detectRulesAnomalyForNewValue(
        normalizedValue,
        indicator.dataType,
        chronological,
        indicator,
        config,
      );
      anomalyResult = {
        isAnomaly: ruleResult.isAnomaly,
        anomalyReason: ruleResult.anomalyReason ?? "Insufficient data",
      };
    }
  } else {
    const ruleResult = detectRulesAnomalyForNewValue(
      normalizedValue,
      indicator.dataType,
      chronological,
      indicator,
      config,
    );
    anomalyResult = {
      isAnomaly: ruleResult.isAnomaly,
      anomalyReason: ruleResult.anomalyReason,
    };
  }

  try {
    return await submissionRepo.updateSubmissionData(submission.id, {
      reportedAt: reportedAt!,
      value: normalizedValue,
      categoryValue: normalizedCategoryValue,
      disaggregationKey: data.disaggregationKey ?? null,
      evidence: data.evidence ?? null,
      updatedByUserId: userId,
      isAnomaly: anomalyResult.isAnomaly,
      anomalyReason: anomalyResult.anomalyReason ?? null,
      anomalyStatus: anomalyResult.isAnomaly ? AnomalyStatus.DETECTED : null,
      anomalyScore: anomalyResult.anomalyScore ?? null,
      anomalyThreshold: anomalyResult.anomalyThreshold ?? null,
      anomalyMethod: anomalyResult.anomalyMethod ?? null,
      anomalyMeta: anomalyResult.anomalyMeta ?? null,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw toSubmissionConflictError();
    }
    throw error;
  }
};

export const deleteSubmission = async (
  submissionId: number,
  userId: number,
  role: Role,
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission) {
    throw new NotFoundError("SUBMISSION_NOT_FOUND", "Submission not found");
  }
  if ((submission as any).deletedAt) return;
  ensureCanModifySubmission(submission, userId, role);
  await submissionRepo.softDeleteSubmission(submission.id, userId);
};

export const restoreSubmission = async (submissionId: number, userId: number) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission) {
    throw new NotFoundError("SUBMISSION_NOT_FOUND", "Submission not found");
  }
  if (!(submission as any).deletedAt) return submission;
  try {
    return await submissionRepo.restoreSubmission(submission.id, userId);
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw toSubmissionConflictError();
    }
    throw error;
  }
};

export const acknowledgeAnomaly = async (
  submissionId: number,
  userId: number,
  notes?: string,
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission)
    throw new NotFoundError("SUBMISSION_NOT_FOUND", "Submission not found");
  if (!submission.isAnomaly) {
    throw new BadRequestError(
      "NOT_ANOMALY",
      "Submission is not flagged as anomaly",
    );
  }

  return submissionRepo.updateSubmission(submissionId, {
    anomalyStatus: AnomalyStatus.ACKNOWLEDGED,
    anomalyReviewedBy: userId,
    anomalyReviewedAt: new Date(),
    anomalyReason: notes || submission.anomalyReason || undefined,
  });
};

export const resolveAnomaly = async (
  submissionId: number,
  userId: number,
  notes?: string,
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission)
    throw new NotFoundError("SUBMISSION_NOT_FOUND", "Submission not found");
  if (!submission.isAnomaly) {
    throw new BadRequestError(
      "NOT_ANOMALY",
      "Submission is not flagged as anomaly",
    );
  }

  return submissionRepo.updateSubmission(submissionId, {
    anomalyStatus: AnomalyStatus.RESOLVED,
    anomalyReviewedBy: userId,
    anomalyReviewedAt: new Date(),
    anomalyReason: notes || submission.anomalyReason || undefined,
  });
};

export const markAnomalyFalsePositive = async (
  submissionId: number,
  userId: number,
  notes?: string,
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission)
    throw new NotFoundError("SUBMISSION_NOT_FOUND", "Submission not found");
  if (!submission.isAnomaly) {
    throw new BadRequestError(
      "NOT_ANOMALY",
      "Submission is not flagged as anomaly",
    );
  }

  return submissionRepo.updateSubmission(submissionId, {
    anomalyStatus: AnomalyStatus.FALSE_POSITIVE,
    anomalyReviewedBy: userId,
    anomalyReviewedAt: new Date(),
    anomalyReason: notes || submission.anomalyReason || undefined,
  });
};

export const updateAnomalyStatus = async (
  submissionId: number,
  status: AnomalyStatus,
  userId: number,
  notes?: string,
) => {
  const submission = await submissionRepo.getById(submissionId);
  if (!submission)
    throw new NotFoundError("SUBMISSION_NOT_FOUND", "Submission not found");
  if (!submission.isAnomaly) {
    throw new BadRequestError(
      "NOT_ANOMALY",
      "Submission is not flagged as anomaly",
    );
  }

  return submissionRepo.updateSubmission(submissionId, {
    anomalyStatus: status,
    anomalyReviewedBy: userId,
    anomalyReviewedAt: new Date(),
    anomalyReason: notes || submission.anomalyReason || undefined,
  });
};
