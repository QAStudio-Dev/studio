-- CreateIndex
CREATE INDEX "SmsMessage_teamId_direction_status_createdAt_idx" ON "SmsMessage"("teamId", "direction", "status", "createdAt");
