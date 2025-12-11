-- CreateTable
CREATE TABLE "ReceivedSmsMessage" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "messageSid" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT,
    "numMedia" INTEGER NOT NULL DEFAULT 0,
    "accountSid" TEXT NOT NULL,
    "metadata" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivedSmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceivedSmsMessage_messageSid_key" ON "ReceivedSmsMessage"("messageSid");

-- CreateIndex
CREATE INDEX "ReceivedSmsMessage_teamId_idx" ON "ReceivedSmsMessage"("teamId");

-- CreateIndex
CREATE INDEX "ReceivedSmsMessage_messageSid_idx" ON "ReceivedSmsMessage"("messageSid");

-- CreateIndex
CREATE INDEX "ReceivedSmsMessage_from_idx" ON "ReceivedSmsMessage"("from");

-- CreateIndex
CREATE INDEX "ReceivedSmsMessage_to_idx" ON "ReceivedSmsMessage"("to");

-- CreateIndex
CREATE INDEX "ReceivedSmsMessage_receivedAt_idx" ON "ReceivedSmsMessage"("receivedAt");

-- CreateIndex
CREATE INDEX "ReceivedSmsMessage_teamId_receivedAt_idx" ON "ReceivedSmsMessage"("teamId", "receivedAt");

-- AddForeignKey
ALTER TABLE "ReceivedSmsMessage" ADD CONSTRAINT "ReceivedSmsMessage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
