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

export type MlHealthStatus = {
  reachable: boolean;
  latencyMs: number | null;
  checkedAt: string;
  lastError?: string;
};

export class MlServiceError extends Error {
  type: "CONFIG" | "TIMEOUT" | "HTTP" | "NETWORK";
  statusCode?: number;

  constructor(
    type: "CONFIG" | "TIMEOUT" | "HTTP" | "NETWORK",
    message: string,
    statusCode?: number,
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
  }
}

const buildHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.mlServiceApiKey) {
    headers["Authorization"] = `Bearer ${config.mlServiceApiKey}`;
  }
  return headers;
};

const callMlEndpoint = async (
  path: string,
  payload: unknown,
): Promise<Response> => {
  if (!config.mlServiceUrl) {
    throw new MlServiceError("CONFIG", "ML service URL is not configured");
  }

  const baseUrl = config.mlServiceUrl.replace(/\/$/, "");
  try {
    return await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.mlServiceTimeoutMs),
    });
  } catch (error: any) {
    if (error?.name === "TimeoutError") {
      throw new MlServiceError(
        "TIMEOUT",
        `ML service timed out after ${config.mlServiceTimeoutMs}ms`,
      );
    }
    throw new MlServiceError(
      "NETWORK",
      `ML service network error: ${error?.message || "Unknown error"}`,
    );
  }
};

export const scoreSubmission = async (
  payload: ScoreRequest,
): Promise<ScoreResult> => {
  const res = await callMlEndpoint("/score", payload);

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new MlServiceError(
      "HTTP",
      `ML service error: ${message || res.statusText}`,
      res.status,
    );
  }

  return (await res.json()) as ScoreResult;
};

export const scoreBatch = async (payload: {
  indicatorId: number;
  dataType: IndicatorDataType;
  values: number[];
  config: ScoreRequest["config"];
}): Promise<{ results: ScoreResult[] }> => {
  const res = await callMlEndpoint("/score/batch", payload);

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new MlServiceError(
      "HTTP",
      `ML service error: ${message || res.statusText}`,
      res.status,
    );
  }

  return (await res.json()) as { results: ScoreResult[] };
};

export const healthCheck = async (): Promise<MlHealthStatus> => {
  const checkedAt = new Date().toISOString();
  if (!config.mlServiceUrl) {
    return {
      reachable: false,
      latencyMs: null,
      checkedAt,
      lastError: "ML service URL is not configured",
    };
  }

  const baseUrl = config.mlServiceUrl.replace(/\/$/, "");
  const startedAt = Date.now();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(config.mlServiceTimeoutMs),
    });
    if (!res.ok) {
      const message = await res.text().catch(() => res.statusText);
      return {
        reachable: false,
        latencyMs: Date.now() - startedAt,
        checkedAt,
        lastError: message || res.statusText,
      };
    }
    return {
      reachable: true,
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  } catch (error: any) {
    return {
      reachable: false,
      latencyMs: Date.now() - startedAt,
      checkedAt,
      lastError: error?.message || "ML health check failed",
    };
  }
};
