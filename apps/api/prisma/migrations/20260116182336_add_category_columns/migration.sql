-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN     "baselineCategory" TEXT,
ADD COLUMN     "targetCategory" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "categoryValue" TEXT;
