/**
 * Team-related types
 *
 * IMPORTANT: This file defines TeamPlan as a const object instead of importing from Prisma
 * because Prisma Client cannot be imported in browser code (it causes build errors).
 *
 * - Use this TeamPlan const in Svelte components (.svelte files)
 * - Use TeamPlan from '$prisma/client' in server-side code (.server.ts files)
 * - Keep these values in sync with prisma/schema.prisma
 */

/**
 * Team plan levels
 * Must match the TeamPlan enum in prisma/schema.prisma
 */
export const TeamPlan = {
	FREE: 'FREE',
	PRO: 'PRO',
	ENTERPRISE: 'ENTERPRISE'
} as const;

/**
 * Type representing a team plan value
 */
export type TeamPlanType = (typeof TeamPlan)[keyof typeof TeamPlan];
