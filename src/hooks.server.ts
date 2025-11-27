import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requiresPayment } from '$lib/server/subscriptions';
import { getCachedOrFetch, CacheKeys, CacheTTL } from '$lib/server/redis';
import { getCurrentUser } from '$lib/server/sessions';
import { validateEnvironment } from '$lib/server/env';
import type { SubscriptionStatus } from '$prisma/client';

// Validate environment variables at startup
// This will throw an error if required variables are missing or using insecure defaults in production
validateEnvironment();

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

// Public API routes that don't require Clerk authentication
// These routes handle their own authentication (API keys, Slack signatures, etc.)
const publicApiRoutes = [
	'/api/integrations/slack/interactions',
	'/api/integrations/slack/webhook',
	'/api/test-results'
];

// Function to check if a path is a public API route
function isPublicApiRoute(pathname: string): boolean {
	// console.log('[Hooks] Checking if public route:', pathname);

	// Exact matches for specific routes
	if (publicApiRoutes.includes(pathname)) {
		// console.log('[Hooks] ✅ Matched public route (exact):', pathname);
		return true;
	}

	// Pattern matches for dynamic routes
	// Match /api/test-runs/{id}/complete
	if (/^\/api\/test-runs\/[^/]+\/complete$/.test(pathname)) {
		// console.log('[Hooks] ✅ Matched public route (pattern): test-runs/complete');
		return true;
	}

	// Note: We no longer bypass Clerk for API routes
	// The endpoints use requireApiAuth() which supports BOTH Clerk sessions and API keys
	// This allows browser users (with Clerk sessions) and API clients (with API keys) to both work

	// Match /api/test-runs (POST only - for creating test runs via API)
	// This is checked in the endpoint itself, but we need Clerk context for session auth
	// so we don't skip it here

	// console.log('[Hooks] ❌ Not a public route:', pathname);
	return false;
}

// Session authentication handler
const handleAuth: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Check if this is a public route
	if (isPublicApiRoute(pathname)) {
		// Skip authentication for public routes
		return resolve(event);
	}

	// Get current user from session
	const userId = await getCurrentUser(event);

	// Store user ID in locals for easy access
	event.locals.userId = userId || null;

	// Create auth() function to match Clerk's API
	event.locals.auth = () => ({ userId: userId || null });

	return resolve(event);
};

// Define the team status type for caching
type TeamStatus = {
	id: string;
	overSeatLimit: boolean;
	subscription: {
		status: SubscriptionStatus;
	} | null;
};

// Middleware to check for over-seat-limit teams and redirect to resolution page
// Note: This only runs on main navigation routes, not API/static assets
//
// PERFORMANCE: This middleware uses Redis caching with a 5-minute TTL to reduce DB queries.
// Cache is invalidated when team status changes (webhooks, member updates).
const handleSeatLimitCheck: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Skip for routes that don't need team status checks (must be before searchParams access)
	const shouldSkip =
		pathname.startsWith('/api/') || // API routes handle their own checks
		pathname.includes('.') || // Static files
		pathname.startsWith('/login') ||
		pathname.startsWith('/sign-up') ||
		pathname.startsWith('/teams/new') ||
		pathname === '/' || // Landing page
		pathname.startsWith('/docs') || // Public docs
		pathname.startsWith('/blog') || // Blog pages
		pathname.startsWith('/about') || // About page
		pathname.startsWith('/contact') || // Contact page
		pathname.startsWith('/privacy') || // Privacy page
		pathname.startsWith('/terms') || // Terms page
		/^\/teams\/[^/]+\/over-limit/.test(pathname) || // Already on resolution page
		/^\/teams\/[^/]+\/payment-required/.test(pathname); // Already on payment page

	if (shouldSkip) {
		return resolve(event);
	}

	// Get user ID from Clerk session (needed for both override check and seat limit check)
	if (!event.locals.auth || typeof event.locals.auth !== 'function') {
		return resolve(event);
	}

	const { userId } = event.locals.auth() || {};
	if (!userId) {
		return resolve(event);
	}

	// Get user's teamId and role (single query for efficiency)
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true, role: true }
	});

	// Check for admin override parameter (emergency bypass)
	// Usage: ?__override=true (double underscore to indicate system parameter)
	// Note: This must come after shouldSkip to avoid accessing searchParams during prerendering
	const overrideParam = event.url.searchParams.get('__override');
	if (overrideParam === 'true') {
		// Verify user has ADMIN role
		if (user?.role === 'ADMIN') {
			console.warn(
				`[Middleware] Admin override used by ${userId} for ${pathname} - seat limit check bypassed`
			);
			return resolve(event);
		} else {
			console.error(`[Security] Unauthorized override attempt by ${userId} on ${pathname}`);
			// Continue with normal seat limit check instead of bypassing
		}
	}

	// If user has no team, skip checks
	if (!user?.teamId) {
		return resolve(event);
	}

	// Get team status with caching (5-minute TTL)
	// Note: This will gracefully handle cache misses by falling back to DB query
	const teamStatus = await getCachedOrFetch<TeamStatus | null>(
		CacheKeys.teamStatus(user.teamId),
		async () => {
			const team = await db.team.findUnique({
				where: { id: user.teamId! },
				select: {
					id: true,
					overSeatLimit: true,
					subscription: {
						select: {
							status: true
						}
					}
				}
			});
			if (!team) {
				// Team was deleted - clear user's teamId
				console.warn(
					`[Middleware] Team ${user.teamId} was deleted, clearing user ${userId}'s teamId`
				);
				await db.user.update({
					where: { id: userId },
					data: { teamId: null }
				});
				return null;
			}
			return team;
		},
		CacheTTL.teamStatus
	);

	// If team was deleted, allow navigation (user's teamId was cleared above)
	if (!teamStatus) {
		return resolve(event);
	}

	// Priority 1: Over seat limit (most urgent)
	// Note: The over-limit and payment-required routes are excluded from this check
	// via shouldSkip above to prevent redirect loops
	if (teamStatus.overSeatLimit) {
		throw redirect(302, `/teams/${teamStatus.id}/over-limit`);
	}

	// Priority 2: Payment required (subscription issues)
	if (teamStatus.subscription && requiresPayment(teamStatus.subscription)) {
		throw redirect(302, `/teams/${teamStatus.id}/payment-required`);
	}

	return resolve(event);
};

export const handle: Handle = sequence(handleAuth, handleSeatLimitCheck, handleParaglide);
