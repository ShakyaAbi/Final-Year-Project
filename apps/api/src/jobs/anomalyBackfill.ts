import { prisma } from "../prisma";
import { IndicatorDataType, Prisma } from "@prisma/client";
import { normalizeAnomalyConfig } from "../services/anomalyConfig";
import { scoreBatch } from "../services/mlService";
import { config } from "../config/env";

const isNumericDataType = (dataType: IndicatorDataType) =>
  dataType === "NUMBER" ||
  dataType === "PERCENT" ||
  dataType === "CATEGORICAL";

const DEFAULT_LIMIT = 200;

const runBackfill = async () => {
  const indicators = await prisma.indicator.findMany({
    where: {
      anomalyConfig: { not: Prisma.JsonNull },
    },
    orderBy: { id: "asc" },
  });

  for (const indicator of indicators) {
    if (!isNumericDataType(indicator.dataType)) continue;

    const anomalyConfig = normalizeAnomalyConfig(
      (indicator.anomalyConfig as any) ?? null,
    );

    if (!anomalyConfig.enabled || anomalyConfig.mode !== "ML") continue;

    const windowSize = anomalyConfig.ml?.windowSize ?? DEFAULT_LIMIT;
    const minPoints = anomalyConfig.ml?.minPoints ?? 20;
    const limit = Math.max(windowSize, minPoints);

    const submissions = await prisma.submission.findMany({
      where: { indicatorId: indicator.id },
      orderBy: { reportedAt: "asc" },
      take: limit,
    });

    const values = submissions
      .map((s) => Number(s.value))
      .filter(Number.isFinite);

    if (values.length < minPoints) continue;

    const { results } = await scoreBatch({
      indicatorId: indicator.id,
      dataType: indicator.dataType,
      values,
      config: {
        method: anomalyConfig.ml?.method ?? "ISOLATION_FOREST",
        contamination: anomalyConfig.ml?.contamination ?? 0.05,
        windowSize: anomalyConfig.ml?.windowSize ?? 50,
        minPoints,
        seed: anomalyConfig.ml?.seed ?? 42,
      },
    });

    const updates = submissions.slice(-results.length).map((submission, i) => {
      const result = results[i];
      return prisma.submission.update({
        where: { id: submission.id },
        data: {
          isAnomaly: result.isAnomaly,
          anomalyReason: result.reason,
          anomalyStatus: result.isAnomaly ? "DETECTED" : null,
          anomalyScore: result.score,
          anomalyThreshold: result.threshold,
          anomalyMethod: result.method,
          anomalyMeta: result.meta ?? Prisma.JsonNull,
        },
      });
    });

    for (let i = 0; i < updates.length; i += config.anomalyBackfillBatchSize) {
      const batch = updates.slice(i, i + config.anomalyBackfillBatchSize);
      await prisma.$transaction(batch);
    }
  }
};

if (require.main === module) {
  runBackfill()
    .then(() => {
      console.log("Anomaly backfill complete");
      return prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error("Anomaly backfill failed", error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

export { runBackfill };
