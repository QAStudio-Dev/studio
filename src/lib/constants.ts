/**
 * Application-wide constants
 */

/**
 * Free tier subscription limits
 * These limits apply to users without an active subscription
 */
export const FREE_TIER_LIMITS = {
	/** Maximum number of team members allowed on free tier */
	MEMBERS: 1,
	/** Maximum number of projects allowed on free tier */
	PROJECTS: 1
} as const;

/**
 * Subscription grace period
 * Users with PAST_DUE status get continued access during grace period
 */
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 7;

/**
 * Cache TTL values (in seconds)
 * Used for performance optimization of frequently accessed data
 */
export const CACHE_TTL = {
	/** Team subscription status cache */
	TEAM_STATUS: 5 * 60, // 5 minutes
	/** User project list cache */
	USER_PROJECTS: 15 * 60, // 15 minutes
	/** Team member list cache */
	TEAM_MEMBERS: 10 * 60 // 10 minutes
} as const;
