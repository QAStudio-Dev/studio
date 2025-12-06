-- Make passwordHash nullable to allow system user with NULL password
-- This is a two-step migration:
-- 1. Make passwordHash nullable in schema
-- 2. Add system user with NULL password
-- 3. Add constraint to prevent system user from having a password

-- Step 1: Make passwordHash nullable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Step 2: Add system user for automated operations (cron jobs, etc.)
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

-- Step 3: Add constraint to prevent system user from having a password
-- This ensures the system user can never be used for authentication
--
-- SECURITY RATIONALE:
-- - System user is only for audit logging automated operations
-- - Should never be used for login/authentication
-- - Constraint prevents accidental or malicious password setting
--
-- ROLLBACK PROCEDURE (manual):
-- ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "system_user_no_password";

-- Drop constraint if it exists (from previous failed migration attempt)
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "system_user_no_password";

-- Add the constraint
ALTER TABLE "User"
ADD CONSTRAINT "system_user_no_password"
CHECK (
  -- If this is the system user, password must be NULL
  (id != 'system') OR (id = 'system' AND "passwordHash" IS NULL)
);
