-- CreateIndex
CREATE INDEX "EnterpriseInquiry_email_createdAt_idx" ON "EnterpriseInquiry"("email", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseInquiry_status_createdAt_idx" ON "EnterpriseInquiry"("status", "createdAt");
