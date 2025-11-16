import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureUser } from './users';
import { db } from './db';
import { isSubscriptionCurrent, requiresPayment } from './subscriptions';

/**
 * Require authentication for API routes
 * Throws 401 if user is not authenticated
 * Ensures user exists in database
 */
export async function requireAuth(event: RequestEvent) {
	// Check if Clerk auth is available
	if (!event.locals.auth || typeof event.locals.auth !== 'function') {
		throw error(401, {
			message: 'Unauthorized - Authentication required'
		});
	}

	const { userId } = event.locals.auth() || {};

	if (!userId) {
		throw error(401, {
			message: 'Unauthorized - Authentication required'
		});
	}

	// Ensure user exists in database (sync from Clerk if needed)
	await ensureUser(userId);

	return userId;
}

/**
 * Get current user ID if authenticated, otherwise returns null
 */
export function getCurrentUserId(event: RequestEvent): string | null {
	if (!event.locals.auth || typeof event.locals.auth !== 'function') {
		return null;
	}
	const { userId } = event.locals.auth() || {};
	return userId || null;
}

/**
 * Get current user session data
 */
export function getCurrentSession(event: RequestEvent) {
	if (!event.locals.auth || typeof event.locals.auth !== 'function') {
		return null;
	}
	return event.locals.auth();
}

/**
 * Require specific role for access
 */
export async function requireRole(event: RequestEvent, allowedRoles: string[]) {
	const userId = await requireAuth(event);
	const user = await ensureUser(userId);

	if (!user || !allowedRoles.includes(user.role)) {
		throw error(403, {
			message: 'Forbidden - Insufficient permissions'
		});
	}

	return user;
}

/**
 * Require current subscription (ACTIVE or PAST_DUE) for API access
 * Throws 402 Payment Required if subscription is not current
 * Free users are exempt if they're within their 1-project limit
 */
export async function requireCurrentSubscription(event: RequestEvent, feature?: string) {
	const userId = await requireAuth(event);

	// Get user with team and subscription
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true,
					projects: true
				}
			}
		}
	});

	if (!user) {
		throw error(401, { message: 'User not found' });
	}

	// If user has no team or no subscription, they're on free plan
	// Free users get 1 project, so check project count
	if (!user.team?.subscription) {
		const projectCount = user.team?.projects.length || 0;

		// Free users can use API for their first project only (0 < 1)
		// Once they have 1 project (projectCount === 1), they can still use basic API
		// But they cannot create more projects (checked in create endpoint)
		if (projectCount < 2 && !feature) {
			return { userId, user, isFree: true };
		}

		// Premium features require subscription
		throw error(402, {
			message:
				'This feature requires an active subscription. Please upgrade your plan at /teams/new'
		});
	}

	// Check if subscription is current (ACTIVE or PAST_DUE)
	if (!isSubscriptionCurrent(user.team.subscription)) {
		const statusMessages: Record<string, string> = {
			CANCELED: 'Your subscription has been canceled. Please reactivate at /teams/' + user.team.id,
			UNPAID:
				'Your subscription is unpaid. Please update your payment method at /teams/' + user.team.id,
			INCOMPLETE: 'Please complete your subscription setup at /teams/' + user.team.id,
			INCOMPLETE_EXPIRED:
				'Your subscription setup has expired. Please start a new subscription at /teams/new'
		};

		const message =
			statusMessages[user.team.subscription.status] ||
			'Your subscription is not active. Please update your payment at /teams/' + user.team.id;

		throw error(402, { message });
	}

	// Check if team is over seat limit
	if (user.team.overSeatLimit) {
		throw error(403, {
			message:
				'Your team is over the seat limit. Please remove members or upgrade at /teams/' +
				user.team.id +
				'/over-limit'
		});
	}

	return { userId, user, isFree: false };
}

/**
 * Require premium feature access (must have ACTIVE or PAST_DUE subscription)
 * More strict than requireCurrentSubscription - no free tier access
 */
export async function requirePremiumFeature(event: RequestEvent, featureName: string) {
	const userId = await requireAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true
				}
			}
		}
	});

	if (!user) {
		throw error(401, { message: 'User not found' });
	}

	// Premium features require subscription
	if (!user.team?.subscription || !isSubscriptionCurrent(user.team.subscription)) {
		throw error(402, {
			message: `${featureName} is only available on Pro plans. Please upgrade at /teams/new`
		});
	}

	// Check if team is over seat limit
	if (user.team.overSeatLimit) {
		throw error(403, {
			message:
				'Your team is over the seat limit. Please resolve at /teams/' + user.team.id + '/over-limit'
		});
	}

	return { userId, user };
}
