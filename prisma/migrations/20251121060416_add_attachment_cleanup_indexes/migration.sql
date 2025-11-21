-- CreateIndex
CREATE INDEX "Attachment_createdAt_testCaseId_idx" ON "Attachment"("createdAt", "testCaseId");

-- CreateIndex
CREATE INDEX "Attachment_createdAt_testResultId_idx" ON "Attachment"("createdAt", "testResultId");
