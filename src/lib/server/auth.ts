import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureUser } from './users';

/**
 * Require authentication for API routes
 * Throws 401 if user is not authenticated
 * Ensures user exists in database
 */
export async function requireAuth(event: RequestEvent) {
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
	const { userId } = event.locals.auth() || {};
	return userId || null;
}

/**
 * Get current user session data
 */
export function getCurrentSession(event: RequestEvent) {
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
