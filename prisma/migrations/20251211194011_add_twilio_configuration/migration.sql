-- DropIndex
DROP INDEX "idx_team_sso_domains";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "twilioAccountSid" TEXT,
ADD COLUMN     "twilioAuthToken" TEXT,
ADD COLUMN     "twilioConfiguredAt" TIMESTAMP(3),
ADD COLUMN     "twilioConfiguredBy" TEXT,
ADD COLUMN     "twilioEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twilioMessagingUrl" TEXT,
ADD COLUMN     "twilioPhoneNumber" TEXT,
ALTER COLUMN "ssoDomains" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Team_plan_idx" ON "Team"("plan");
