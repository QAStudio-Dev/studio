-- CreateTable
CREATE TABLE "SentSmsMessage" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "messageSid" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "accountSid" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentSmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentSmsMessage_messageSid_key" ON "SentSmsMessage"("messageSid");

-- CreateIndex
CREATE INDEX "SentSmsMessage_teamId_idx" ON "SentSmsMessage"("teamId");

-- CreateIndex
CREATE INDEX "SentSmsMessage_messageSid_idx" ON "SentSmsMessage"("messageSid");

-- CreateIndex
CREATE INDEX "SentSmsMessage_from_idx" ON "SentSmsMessage"("from");

-- CreateIndex
CREATE INDEX "SentSmsMessage_to_idx" ON "SentSmsMessage"("to");

-- CreateIndex
CREATE INDEX "SentSmsMessage_sentBy_idx" ON "SentSmsMessage"("sentBy");

-- CreateIndex
CREATE INDEX "SentSmsMessage_status_idx" ON "SentSmsMessage"("status");

-- CreateIndex
CREATE INDEX "SentSmsMessage_sentAt_idx" ON "SentSmsMessage"("sentAt");

-- CreateIndex
CREATE INDEX "SentSmsMessage_teamId_sentAt_idx" ON "SentSmsMessage"("teamId", "sentAt");

-- AddForeignKey
ALTER TABLE "SentSmsMessage" ADD CONSTRAINT "SentSmsMessage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
