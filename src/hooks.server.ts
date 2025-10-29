import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

// Public routes that don't require Clerk authentication
// These routes handle their own authentication (API keys, Slack signatures, etc.)
const publicRoutes = [
	'/api/integrations/slack/interactions',
	'/api/integrations/slack/webhook',
	'/api/test-results',
	'/api/test-runs'
];

const handleClerkWithPublicRoutes: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Check if this is a public route
	const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

	if (isPublicRoute) {
		// Skip Clerk authentication for public routes
		return resolve(event);
	}

	// Apply Clerk authentication for all other routes
	const clerkHandler = withClerkHandler();
	return clerkHandler({ event, resolve });
};

export const handle: Handle = sequence(handleClerkWithPublicRoutes, handleParaglide);
