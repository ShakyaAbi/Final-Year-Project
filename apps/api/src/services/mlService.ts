import { IndicatorDataType } from "@prisma/client";
import { config } from "../config/env";

export type ScoreRequest = {
  indicatorId: number;
  dataType: IndicatorDataType;
  values: number[];
  newValue: number;
  config: {
    method: "ISOLATION_FOREST";
    contamination: number;
    windowSize: number;
    minPoints: number;
    seed?: number;
  };
};

export type ScoreResult = {
  isAnomaly: boolean;
  score: number;
  threshold: number;
  method: string;
  reason: string;
  meta?: Record<string, any> | null;
};

const buildHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.mlServiceApiKey) {
    headers["Authorization"] = `Bearer ${config.mlServiceApiKey}`;
  }
  return headers;
};

export const scoreSubmission = async (
  payload: ScoreRequest,
): Promise<ScoreResult> => {
  if (!config.mlServiceUrl) {
    throw new Error("ML service URL is not configured");
  }

  const baseUrl = config.mlServiceUrl.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/score`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.mlServiceTimeoutMs),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(`ML service error: ${message || res.statusText}`);
  }

  return (await res.json()) as ScoreResult;
};

export const scoreBatch = async (payload: {
  indicatorId: number;
  dataType: IndicatorDataType;
  values: number[];
  config: ScoreRequest["config"];
}): Promise<{ results: ScoreResult[] }> => {
  if (!config.mlServiceUrl) {
    throw new Error("ML service URL is not configured");
  }

  const baseUrl = config.mlServiceUrl.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/score/batch`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.mlServiceTimeoutMs),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(`ML service error: ${message || res.statusText}`);
  }

  return (await res.json()) as { results: ScoreResult[] };
};
