-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "accountManager" TEXT,
ADD COLUMN     "contractEnd" TIMESTAMP(3),
ADD COLUMN     "contractStart" TIMESTAMP(3),
ADD COLUMN     "customSeats" INTEGER,
ADD COLUMN     "invoiceEmail" TEXT,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "EnterpriseInquiry" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "estimatedSeats" INTEGER,
    "requirements" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseInquiry_teamId_idx" ON "EnterpriseInquiry"("teamId");

-- CreateIndex
CREATE INDEX "EnterpriseInquiry_email_idx" ON "EnterpriseInquiry"("email");

-- CreateIndex
CREATE INDEX "EnterpriseInquiry_status_idx" ON "EnterpriseInquiry"("status");

-- CreateIndex
CREATE INDEX "EnterpriseInquiry_createdAt_idx" ON "EnterpriseInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "Team_plan_idx" ON "Team"("plan");

-- AddForeignKey
ALTER TABLE "EnterpriseInquiry" ADD CONSTRAINT "EnterpriseInquiry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
