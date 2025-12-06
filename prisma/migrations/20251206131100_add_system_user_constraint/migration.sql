-- Add constraint to prevent system user from having a password
-- This ensures the system user can never be used for authentication
--
-- SECURITY RATIONALE:
-- - System user is only for audit logging automated operations
-- - Should never be used for login/authentication
-- - Constraint prevents accidental or malicious password setting
--
-- ROLLBACK PROCEDURE (manual):
-- ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "system_user_no_password";

ALTER TABLE "User"
ADD CONSTRAINT "system_user_no_password"
CHECK (
  -- If this is the system user, password must be NULL
  (id != 'system') OR (id = 'system' AND "passwordHash" IS NULL)
);
