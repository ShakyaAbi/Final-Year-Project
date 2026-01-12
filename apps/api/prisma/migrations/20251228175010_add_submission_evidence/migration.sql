-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budgetAmount" DOUBLE PRECISION,
ADD COLUMN     "budgetCurrency" TEXT,
ADD COLUMN     "donor" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "sectors" TEXT[] DEFAULT ARRAY[]::TEXT[];
