-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('DETECTED', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "anomalyReason" TEXT,
ADD COLUMN     "anomalyReviewedAt" TIMESTAMP(3),
ADD COLUMN     "anomalyReviewedBy" INTEGER,
ADD COLUMN     "anomalyStatus" "AnomalyStatus",
ADD COLUMN     "isAnomaly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "timezone" TEXT;

-- CreateIndex
CREATE INDEX "Submission_anomalyReviewedBy_idx" ON "Submission"("anomalyReviewedBy");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_anomalyReviewedBy_fkey" FOREIGN KEY ("anomalyReviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
