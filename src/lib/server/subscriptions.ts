import { error } from '@sveltejs/kit';
import { db } from './db';
import type { SubscriptionStatus, Subscription } from '@prisma/client';

/**
 * Check if a team has an active subscription
 */
export async function hasActiveSubscription(teamId: string): Promise<boolean> {
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
 */
export async function requireActiveSubscription(teamId: string) {
	const hasActive = await hasActiveSubscription(teamId);

	if (!hasActive) {
		throw error(402, {
			message: 'This feature requires an active subscription. Please upgrade your plan.'
		});
	}
}

/**
 * Check if team has available seats
 */
export async function hasAvailableSeats(teamId: string): Promise<boolean> {
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

	// Free teams (no subscription) only allow 1 member
	if (!team.subscription) {
		return team.members.length < 1;
	}

	// Check if current members are within seat limit
	return team.members.length < team.subscription.seats;
}

/**
 * Require available seats or throw error
 */
export async function requireAvailableSeats(teamId: string) {
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
 */
export async function isFeatureAvailable(
	teamId: string,
	feature: 'ai_analysis' | 'advanced_reports' | 'integrations'
): Promise<boolean> {
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
 */
export async function requireFeature(
	teamId: string,
	feature: 'ai_analysis' | 'advanced_reports' | 'integrations'
) {
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
 * Get team subscription limits
 */
export async function getTeamLimits(teamId: string) {
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

	const isFree = !team.subscription || team.subscription.status === 'CANCELED';

	return {
		plan: isFree ? 'free' : 'pro',
		seats: {
			max: team.subscription?.seats || 1,
			used: team.members.length,
			available: (team.subscription?.seats || 1) - team.members.length
		},
		features: {
			ai_analysis: !isFree,
			advanced_reports: !isFree,
			integrations: !isFree,
			unlimited_projects: true // Both plans have unlimited projects
		},
		subscription: team.subscription
			? {
					status: team.subscription.status,
					currentPeriodEnd: team.subscription.currentPeriodEnd,
					cancelAtPeriodEnd: team.subscription.cancelAtPeriodEnd
				}
			: null
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
