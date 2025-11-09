import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { paraglideMiddleware } from '$lib/paraglide/server';

console.log(process.env.CLERK_SECRET_KEY);

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

export const handle: Handle = sequence(handleClerkWithPublicRoutes, handleParaglide);
