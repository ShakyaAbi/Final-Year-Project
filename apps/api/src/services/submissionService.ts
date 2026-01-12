import { IndicatorDataType } from '@prisma/client';
import * as indicatorRepo from '../repositories/indicatorRepository';
import * as submissionRepo from '../repositories/submissionRepository';
import { BadRequestError, NotFoundError } from '../utils/errors';

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError('INVALID_DATE', 'Invalid date value');
  }
  return d;
};

const normalizeValue = (dataType: IndicatorDataType, value: any, min?: number | null, max?: number | null) => {
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
    default:
      throw new BadRequestError('INVALID_VALUE', 'Unsupported data type');
  }
};

const assessAnomaly = (dataType: IndicatorDataType, value: string, min?: number | null, max?: number | null) => {
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

export const createSubmission = async (
  indicatorId: number,
  data: { reportedAt: string; value: any; evidence?: string | null },
  userId: number
) => {
  const indicator = await indicatorRepo.getById(indicatorId);
  if (!indicator) throw new NotFoundError('INDICATOR_NOT_FOUND', 'Indicator not found');

  const reportedAt = parseDate(data.reportedAt);
  const normalizedValue = normalizeValue(indicator.dataType, data.value, indicator.minValue, indicator.maxValue);

  return submissionRepo.createSubmission({
    indicatorId,
    reportedAt: reportedAt!,
    value: normalizedValue,
    evidence: data.evidence ?? null,
    createdByUserId: userId
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

  return submissions.map((submission) => ({
    ...submission,
    ...assessAnomaly(indicator.dataType, submission.value, indicator.minValue, indicator.maxValue)
  }));
};
