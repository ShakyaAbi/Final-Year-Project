-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN     "reminderDaysAfterDue" INTEGER,
ADD COLUMN     "reminderDaysBeforeDue" INTEGER,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderRecipients" JSONB;
