-- CreateEnum
-- Add system user for automated operations (cron jobs, etc.)
-- This user is used for audit logging of system-initiated actions

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
  'system@internal.qastudio.dev',
  '$2b$12$SYSTEM.USER.CANNOT.LOGIN.SENTINEL.VALUE.ONLY.FOR.AUDIT.TRAIL', -- System user cannot login - hash is intentionally invalid
  'System',
  'User',
  'OWNER',
  true,
  NOW(),
  NOW()
) ON CONFLICT ("id") DO NOTHING;
