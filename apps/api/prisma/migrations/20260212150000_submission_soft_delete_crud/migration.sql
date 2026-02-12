-- Add submission soft-delete and audit columns
ALTER TABLE "Submission"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" INTEGER,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedByUserId" INTEGER;

CREATE INDEX "Submission_deletedAt_idx" ON "Submission"("deletedAt");
CREATE INDEX "Submission_deletedByUserId_idx" ON "Submission"("deletedByUserId");
CREATE INDEX "Submission_updatedByUserId_idx" ON "Submission"("updatedByUserId");

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_deletedByUserId_fkey"
  FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
