/*
  Warnings:

  - You are about to drop the `ReceivedSmsMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SentSmsMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SmsDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- DropForeignKey
ALTER TABLE "ReceivedSmsMessage" DROP CONSTRAINT "ReceivedSmsMessage_teamId_fkey";

-- DropForeignKey
ALTER TABLE "SentSmsMessage" DROP CONSTRAINT "SentSmsMessage_teamId_fkey";

-- DropTable
DROP TABLE "ReceivedSmsMessage";

-- DropTable
DROP TABLE "SentSmsMessage";

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "direction" "SmsDirection" NOT NULL,
    "messageSid" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT,
    "accountSid" TEXT NOT NULL,
    "status" TEXT,
    "sentBy" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "numMedia" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsMessage_messageSid_key" ON "SmsMessage"("messageSid");

-- CreateIndex
CREATE INDEX "SmsMessage_teamId_idx" ON "SmsMessage"("teamId");

-- CreateIndex
CREATE INDEX "SmsMessage_direction_idx" ON "SmsMessage"("direction");

-- CreateIndex
CREATE INDEX "SmsMessage_messageSid_idx" ON "SmsMessage"("messageSid");

-- CreateIndex
CREATE INDEX "SmsMessage_from_idx" ON "SmsMessage"("from");

-- CreateIndex
CREATE INDEX "SmsMessage_to_idx" ON "SmsMessage"("to");

-- CreateIndex
CREATE INDEX "SmsMessage_sentBy_idx" ON "SmsMessage"("sentBy");

-- CreateIndex
CREATE INDEX "SmsMessage_status_idx" ON "SmsMessage"("status");

-- CreateIndex
CREATE INDEX "SmsMessage_createdAt_idx" ON "SmsMessage"("createdAt");

-- CreateIndex
CREATE INDEX "SmsMessage_teamId_direction_createdAt_idx" ON "SmsMessage"("teamId", "direction", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
