-- AlterEnum
ALTER TYPE "IndicatorDataType" ADD VALUE 'CATEGORICAL';

-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN     "categories" JSONB,
ADD COLUMN     "categoryConfig" JSONB;
