-- CreateEnum
CREATE TYPE "AnalysisCategory" AS ENUM ('STALE_LOCATOR', 'TIMING_ISSUE', 'NETWORK_ERROR', 'ASSERTION_FAILURE', 'DATA_ISSUE', 'ENVIRONMENT_ISSUE', 'CONFIGURATION_ERROR', 'OTHER');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "aiAnalysisCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiAnalysisResetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TestResultAnalysis" (
    "id" TEXT NOT NULL,
    "testResultId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "category" "AnalysisCategory" NOT NULL,
    "suggestedFix" TEXT NOT NULL,
    "fixCode" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "wasFixed" BOOLEAN NOT NULL DEFAULT false,
    "fixAppliedAt" TIMESTAMP(3),
    "fixAppliedBy" TEXT,
    "additionalNotes" TEXT,
    "analyzedBy" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestResultAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestResultAnalysis_testResultId_key" ON "TestResultAnalysis"("testResultId");

-- CreateIndex
CREATE INDEX "TestResultAnalysis_category_idx" ON "TestResultAnalysis"("category");

-- CreateIndex
CREATE INDEX "TestResultAnalysis_confidence_idx" ON "TestResultAnalysis"("confidence");

-- CreateIndex
CREATE INDEX "TestResultAnalysis_analyzedAt_idx" ON "TestResultAnalysis"("analyzedAt");

-- CreateIndex
CREATE INDEX "TestResultAnalysis_wasFixed_idx" ON "TestResultAnalysis"("wasFixed");

-- CreateIndex
CREATE INDEX "TestResultAnalysis_category_confidence_idx" ON "TestResultAnalysis"("category", "confidence");

-- AddForeignKey
ALTER TABLE "TestResultAnalysis" ADD CONSTRAINT "TestResultAnalysis_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
