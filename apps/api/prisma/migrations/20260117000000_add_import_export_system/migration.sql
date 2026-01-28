-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('INDICATOR_DEFINITION', 'SUBMISSION');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportMode" AS ENUM ('CREATE_ONLY', 'UPSERT');

-- CreateEnum
CREATE TYPE "RowStatus" AS ENUM ('PENDING', 'VALID', 'WARNING', 'ERROR', 'IMPORTED', 'SKIPPED');

-- AlterTable Indicator (add only new columns)
ALTER TABLE "Indicator" ADD COLUMN IF NOT EXISTS "baselineCategory" TEXT;
ALTER TABLE "Indicator" ADD COLUMN IF NOT EXISTS "targetCategory" TEXT;
ALTER TABLE "Indicator" ADD COLUMN IF NOT EXISTS "validationConfig" JSONB;

-- AlterTable Submission (add only new columns)
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "categoryValue" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "disaggregationKey" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "sourceImportJobId" INTEGER;

-- CreateTable
CREATE TABLE "ImportTemplate" (
    "id" SERIAL NOT NULL,
    "indicatorId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "columnMapping" JSONB NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" SERIAL NOT NULL,
    "importType" "ImportType" NOT NULL,
    "indicatorId" INTEGER,
    "templateId" INTEGER,
    "userId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successfulRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "importMode" "ImportMode" NOT NULL DEFAULT 'CREATE_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJobRow" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "validationStatus" "RowStatus" NOT NULL DEFAULT 'PENDING',
    "errors" JSONB,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJobRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportTemplate" (
    "id" SERIAL NOT NULL,
    "indicatorId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "columnConfig" JSONB NOT NULL,
    "filterConfig" JSONB,
    "formatConfig" JSONB,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportTemplate_indicatorId_idx" ON "ImportTemplate"("indicatorId");

-- CreateIndex
CREATE INDEX "ImportTemplate_createdByUserId_idx" ON "ImportTemplate"("createdByUserId");

-- CreateIndex
CREATE INDEX "ImportJob_indicatorId_idx" ON "ImportJob"("indicatorId");

-- CreateIndex
CREATE INDEX "ImportJob_userId_idx" ON "ImportJob"("userId");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJobRow_jobId_rowNumber_key" ON "ImportJobRow"("jobId", "rowNumber");

-- CreateIndex
CREATE INDEX "ImportJobRow_jobId_idx" ON "ImportJobRow"("jobId");

-- CreateIndex
CREATE INDEX "ImportJobRow_validationStatus_idx" ON "ImportJobRow"("validationStatus");

-- CreateIndex
CREATE INDEX "ExportTemplate_indicatorId_idx" ON "ExportTemplate"("indicatorId");

-- CreateIndex
CREATE INDEX "ExportTemplate_createdByUserId_idx" ON "ExportTemplate"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_indicatorId_reportedAt_disaggregationKey_key" ON "Submission"("indicatorId", "reportedAt", "disaggregationKey");

-- CreateIndex
CREATE INDEX "Submission_sourceImportJobId_idx" ON "Submission"("sourceImportJobId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_sourceImportJobId_fkey" FOREIGN KEY ("sourceImportJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportTemplate" ADD CONSTRAINT "ImportTemplate_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportTemplate" ADD CONSTRAINT "ImportTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ImportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJobRow" ADD CONSTRAINT "ImportJobRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportTemplate" ADD CONSTRAINT "ExportTemplate_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportTemplate" ADD CONSTRAINT "ExportTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
