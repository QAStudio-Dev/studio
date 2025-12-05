-- Add composite unique index on email and createdAt
-- This helps with duplicate detection queries and performance
-- The application layer handles the 24-hour duplicate window check
-- (using NOW() in index predicate is not allowed as it's not immutable)

CREATE INDEX IF NOT EXISTS "EnterpriseInquiry_email_createdAt_idx"
ON "EnterpriseInquiry" ("email", "createdAt" DESC);
