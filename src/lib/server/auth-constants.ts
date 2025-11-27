/**
 * Shared authentication constants
 */

/**
 * Temporary password hash for migrated Clerk users
 * This is a bcrypt hash of "TEMP_PASSWORD_CLERK_MIGRATION" and is used to identify
 * users who need to set up their password after migration from Clerk.
 *
 * DO NOT use this for actual password validation - it's only a marker value.
 */
export const TEMP_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/WYUbv1zY9pQYvD1BO';
