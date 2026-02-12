-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "anomalyMeta" JSONB,
ADD COLUMN     "anomalyMethod" TEXT,
ADD COLUMN     "anomalyScore" DOUBLE PRECISION,
ADD COLUMN     "anomalyThreshold" DOUBLE PRECISION;
