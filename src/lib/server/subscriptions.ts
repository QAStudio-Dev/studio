import { error } from '@sveltejs/kit';
import { db } from './db';
import type { SubscriptionStatus, Subscription } from '$prisma/client';
import { FREE_TIER_LIMITS } from '$lib/constants';
import { DEPLOYMENT_CONFIG } from '$lib/config';

/**
 * Constant representing unlimited seats/resources in self-hosted mode
 */
const UNLIMITED = -1;

/**
 * Check if a team has an active subscription
 * In self-hosted mode, always returns true (all features unlocked)
 */
export async function hasActiveSubscription(teamId: string): Promise<boolean> {
	// Self-hosted deployments have all features unlocked
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return true;
	}

	const subscription = await db.subscription.findUnique({
		where: { teamId }
	});

	if (!subscription) {
		return false;
	}

	return subscription.status === 'ACTIVE';
}

/**
 * Require active subscription or throw error
 * In self-hosted mode, this check is bypassed
 */
export async function requireActiveSubscription(teamId: string) {
	// Self-hosted deployments bypass subscription checks
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return;
	}

	const hasActive = await hasActiveSubscription(teamId);

	if (!hasActive) {
		throw error(402, {
			message: 'This feature requires an active subscription. Please upgrade your plan.'
		});
	}
}

/**
 * Check if team has available seats
 * In self-hosted mode, unlimited seats are available
 */
export async function hasAvailableSeats(teamId: string): Promise<boolean> {
	// Self-hosted deployments have unlimited seats
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return true;
	}

	const team = await db.team.findUnique({
		where: { id: teamId },
		include: {
			members: true,
			subscription: true
		}
	});

	if (!team) {
		return false;
	}

	// Enterprise teams with custom seats use customSeats as the limit
	if (team.plan === 'ENTERPRISE' && team.customSeats) {
		return team.members.length < team.customSeats;
	}

	// Free teams (no subscription) only allow limited members
	if (!team.subscription) {
		return team.members.length < FREE_TIER_LIMITS.MEMBERS;
	}

	// Check if current members are within seat limit
	return team.members.length < team.subscription.seats;
}

/**
 * Require available seats or throw error
 * In self-hosted mode, this check is bypassed
 */
export async function requireAvailableSeats(teamId: string) {
	// Self-hosted deployments bypass seat limits
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return;
	}

	const hasSeats = await hasAvailableSeats(teamId);

	if (!hasSeats) {
		throw error(400, {
			message:
				'Team has reached maximum seat limit. Please upgrade your subscription to add more members.'
		});
	}
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(teamId: string): Promise<SubscriptionStatus | null> {
	const subscription = await db.subscription.findUnique({
		where: { teamId },
		select: { status: true }
	});

	return subscription?.status || null;
}

/**
 * Check if a feature is available for the team
 * In self-hosted mode, all features are always available
 */
export async function isFeatureAvailable(
	teamId: string,
	feature: 'ai_analysis' | 'advanced_reports' | 'integrations'
): Promise<boolean> {
	// Self-hosted deployments have all features unlocked
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return true;
	}

	const subscription = await db.subscription.findUnique({
		where: { teamId }
	});

	// Free teams don't have access to premium features
	if (!subscription || subscription.status !== 'ACTIVE') {
		return false;
	}

	// All pro features are available for active subscriptions
	return true;
}

/**
 * Require feature access or throw error
 * In self-hosted mode, this check is bypassed
 */
export async function requireFeature(
	teamId: string,
	feature: 'ai_analysis' | 'advanced_reports' | 'integrations'
) {
	// Self-hosted deployments bypass feature checks
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return;
	}

	const available = await isFeatureAvailable(teamId, feature);

	if (!available) {
		const featureNames = {
			ai_analysis: 'AI-powered failure analysis',
			advanced_reports: 'Advanced reporting',
			integrations: 'Custom integrations'
		};

		throw error(402, {
			message: `${featureNames[feature]} is only available on Pro plans. Please upgrade to access this feature.`
		});
	}
}

/**
 * Team limits return type
 */
export type TeamLimits = {
	plan: 'free' | 'pro' | 'enterprise';
	seats: {
		/** Maximum seats allowed (-1 for unlimited in self-hosted mode) */
		max: number;
		/** Current number of seats used */
		used: number;
		/** Remaining available seats (-1 for unlimited in self-hosted mode) */
		available: number;
	};
	features: {
		ai_analysis: boolean;
		advanced_reports: boolean;
		integrations: boolean;
		unlimited_projects: boolean;
	};
	subscription: {
		status: SubscriptionStatus;
		currentPeriodEnd: Date | null;
		cancelAtPeriodEnd: boolean;
	} | null;
	selfHosted: boolean;
};

/**
 * Get team subscription limits
 * In self-hosted mode, returns unlimited limits for all features
 */
export async function getTeamLimits(teamId: string): Promise<TeamLimits> {
	const team = await db.team.findUnique({
		where: { id: teamId },
		include: {
			members: true,
			subscription: true,
			projects: true
		}
	});

	if (!team) {
		throw error(404, { message: 'Team not found' });
	}

	// Self-hosted deployments have unlimited everything
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return {
			plan: 'enterprise' as const,
			seats: {
				max: UNLIMITED,
				used: team.members.length,
				available: UNLIMITED
			},
			features: {
				ai_analysis: true,
				advanced_reports: true,
				integrations: true,
				unlimited_projects: true
			},
			subscription: null,
			selfHosted: true
		};
	}

	const isFree = !team.subscription || team.subscription.status === 'CANCELED';

	// Determine seat limit based on plan
	let maxSeats = 1;
	if (team.plan === 'ENTERPRISE' && team.customSeats) {
		// Enterprise plans use customSeats
		maxSeats = team.customSeats;
	} else if (team.subscription) {
		// Pro plans use subscription seats
		maxSeats = team.subscription.seats;
	} else {
		// Free plan uses default limit
		maxSeats = FREE_TIER_LIMITS.MEMBERS;
	}

	return {
		plan: team.plan.toLowerCase() as 'free' | 'pro' | 'enterprise',
		seats: {
			max: maxSeats,
			used: team.members.length,
			available: maxSeats - team.members.length
		},
		features: {
			ai_analysis: !isFree,
			advanced_reports: !isFree,
			integrations: !isFree,
			unlimited_projects: true // All plans have unlimited projects
		},
		subscription: team.subscription
			? {
					status: team.subscription.status,
					currentPeriodEnd: team.subscription.currentPeriodEnd,
					cancelAtPeriodEnd: team.subscription.cancelAtPeriodEnd
				}
			: null,
		selfHosted: false
	};
}

/**
 * Check if subscription status allows feature access (no DB call, pure function)
 * ACTIVE = full access
 * PAST_DUE = grace period, allow access
 * All others = blocked
 */
export function isSubscriptionCurrent(
	subscription: Subscription | { status: SubscriptionStatus } | null | undefined
): boolean {
	if (!subscription) return false;
	return subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE';
}

/**
 * Check if subscription requires immediate payment attention
 * Returns true for CANCELED, UNPAID, INCOMPLETE, INCOMPLETE_EXPIRED
 */
export function requiresPayment(
	subscription: Subscription | { status: SubscriptionStatus } | null | undefined
): boolean {
	if (!subscription) return false;
	return ['CANCELED', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED'].includes(subscription.status);
}

/**
 * Get user-friendly status message for subscription
 */
export function getSubscriptionStatusMessage(
	subscription: Subscription | null | undefined
): string | null {
	if (!subscription) return null;

	const messages: Record<string, string> = {
		ACTIVE: 'Your subscription is active',
		PAST_DUE: 'Payment failed - please update your payment method',
		CANCELED: 'Your subscription has been canceled',
		UNPAID: 'Your subscription is unpaid - please update payment',
		INCOMPLETE: 'Please complete your subscription setup',
		INCOMPLETE_EXPIRED: 'Your subscription setup has expired - please start over'
	};

	return messages[subscription.status] || null;
}
