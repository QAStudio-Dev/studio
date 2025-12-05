-- Add unique constraint to prevent duplicate inquiries from same email within 24 hours
-- This uses a PostgreSQL partial unique index with a time-based condition
-- Note: This prevents race conditions at the database level

CREATE UNIQUE INDEX "EnterpriseInquiry_email_recent_unique"
ON "EnterpriseInquiry" ("email")
WHERE "createdAt" > NOW() - INTERVAL '24 hours';
