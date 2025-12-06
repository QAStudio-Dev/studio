-- Add system user for automated operations (cron jobs, etc.)
-- This user is used for audit logging of system-initiated actions
--
-- SECURITY NOTE:
-- - passwordHash is NULL to prevent any login attempts
-- - Email uses localhost domain to prevent external resolution
-- - Role is OWNER to allow system operations to proceed
-- - This user should never be used for authentication
--
-- ROLLBACK PROCEDURE (manual):
-- DELETE FROM "User" WHERE id = 'system';

INSERT INTO "User" (
  "id",
  "email",
  "passwordHash",
  "firstName",
  "lastName",
  "role",
  "emailVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  'system',
  'system@localhost',  -- localhost domain prevents external resolution
  NULL,  -- NULL password prevents any login attempts
  'System',
  'User',
  'OWNER',
  true,
  NOW(),
  NOW()
) ON CONFLICT ("id") DO NOTHING;
