-- CreateEnum
CREATE TYPE "TeamPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- AlterTable: Rename old column, add new enum column, migrate data, drop old column
ALTER TABLE "Team" RENAME COLUMN "plan" TO "plan_old";

ALTER TABLE "Team" ADD COLUMN "plan" "TeamPlan" NOT NULL DEFAULT 'FREE';

-- Migrate existing data
UPDATE "Team" SET "plan" = 'FREE' WHERE "plan_old" = 'free';
UPDATE "Team" SET "plan" = 'PRO' WHERE "plan_old" = 'pro';
UPDATE "Team" SET "plan" = 'ENTERPRISE' WHERE "plan_old" = 'enterprise';

-- Update teams based on subscription status
-- Teams with active or past-due subscriptions should be PRO
UPDATE "Team"
SET "plan" = 'PRO'
WHERE id IN (
  SELECT "teamId" FROM "Subscription"
  WHERE status IN ('ACTIVE', 'PAST_DUE')
);

-- Teams with canceled/unpaid/incomplete subscriptions should be FREE
-- (unless they're already set to ENTERPRISE manually)
UPDATE "Team"
SET "plan" = 'FREE'
WHERE id IN (
  SELECT "teamId" FROM "Subscription"
  WHERE status IN ('CANCELED', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED')
)
AND "plan" != 'ENTERPRISE';

-- Drop old column
ALTER TABLE "Team" DROP COLUMN "plan_old";
