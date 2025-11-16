-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "overSeatLimit" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Team_overSeatLimit_idx" ON "Team"("overSeatLimit");
