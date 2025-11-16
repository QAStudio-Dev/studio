import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requiresPayment } from '$lib/server/subscriptions';

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

// Create Clerk handler once
const clerkHandler = withClerkHandler();

const handleClerkWithPublicRoutes: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Check if this is a public route
	if (isPublicApiRoute(pathname)) {
		// Skip Clerk authentication for public routes
		return resolve(event);
	}

	// Apply Clerk authentication for all other routes
	return clerkHandler({ event, resolve });
};

// Middleware to check for over-seat-limit teams and redirect to resolution page
// Note: This only runs on main navigation routes, not API/static assets
const handleSeatLimitCheck: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Skip for routes that don't need team status checks
	const shouldSkip =
		pathname.startsWith('/api/') || // API routes handle their own checks
		pathname.includes('.') || // Static files
		pathname.startsWith('/sign-in') ||
		pathname.startsWith('/sign-up') ||
		pathname.startsWith('/teams/new') ||
		pathname === '/' || // Landing page
		pathname.startsWith('/docs') || // Public docs
		/^\/teams\/[^/]+\/over-limit/.test(pathname) || // Already on resolution page
		/^\/teams\/[^/]+\/payment-required/.test(pathname); // Already on payment page

	if (shouldSkip) {
		return resolve(event);
	}

	// Get user ID from Clerk session
	if (!event.locals.auth || typeof event.locals.auth !== 'function') {
		return resolve(event);
	}

	const { userId } = event.locals.auth() || {};
	if (!userId) {
		return resolve(event);
	}

	// Only query team status for users who have a team
	// This is a lightweight query with indexed fields
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			teamId: true,
			team: {
				select: {
					id: true,
					overSeatLimit: true,
					subscription: {
						select: {
							status: true
						}
					}
				}
			}
		}
	});

	// If user has no team, skip checks
	if (!user?.team?.id) {
		return resolve(event);
	}

	// Priority 1: Over seat limit (most urgent)
	if (user.team.overSeatLimit) {
		throw redirect(302, `/teams/${user.team.id}/over-limit`);
	}

	// Priority 2: Payment required (subscription issues)
	if (user.team.subscription && requiresPayment(user.team.subscription)) {
		throw redirect(302, `/teams/${user.team.id}/payment-required`);
	}

	return resolve(event);
};

export const handle: Handle = sequence(
	handleClerkWithPublicRoutes,
	handleSeatLimitCheck,
	handleParaglide
);
