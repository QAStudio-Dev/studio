-- CreateEnum
CREATE TYPE "TeamPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- AlterTable: Rename old column, add new enum column, migrate data, drop old column
ALTER TABLE "Team" RENAME COLUMN "plan" TO "plan_old";

ALTER TABLE "Team" ADD COLUMN "plan" "TeamPlan" NOT NULL DEFAULT 'FREE';

-- Migrate existing data
UPDATE "Team" SET "plan" = 'FREE' WHERE "plan_old" = 'free';
UPDATE "Team" SET "plan" = 'PRO' WHERE "plan_old" = 'pro';
UPDATE "Team" SET "plan" = 'ENTERPRISE' WHERE "plan_old" = 'enterprise';

-- Update teams with active subscriptions to PRO
UPDATE "Team"
SET "plan" = 'PRO'
WHERE id IN (
  SELECT "teamId" FROM "Subscription"
  WHERE status IN ('ACTIVE', 'PAST_DUE')
);

-- Drop old column
ALTER TABLE "Team" DROP COLUMN "plan_old";
