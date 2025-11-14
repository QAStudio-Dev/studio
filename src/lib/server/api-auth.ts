import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { verifyApiKey } from './api-keys';
import { ensureUser } from './users';

/**
 * Authenticate API request with either Clerk session or API key
 * Returns userId if authenticated, throws error otherwise
 * Ensures user exists in database
 */
export async function requireApiAuth(event: RequestEvent): Promise<string> {
	let userId: string | null = null;

	// First try Clerk session auth (if available)
	if (event.locals.auth && typeof event.locals.auth === 'function') {
		const auth = event.locals.auth() || {};
		if (auth.userId) {
			userId = auth.userId;
		}
	}

	// Try API key from Authorization header
	if (!userId) {
		const authHeader = event.request.headers.get('Authorization');
		if (authHeader) {
			const match = authHeader.match(/^Bearer\s+(.+)$/i);
			if (match) {
				const apiKey = match[1];
				userId = await verifyApiKey(apiKey);
			}
		}
	}

	// Also try x-api-key header (legacy support)
	if (!userId) {
		const apiKeyHeader = event.request.headers.get('x-api-key');
		if (apiKeyHeader) {
			userId = await verifyApiKey(apiKeyHeader);
		}
	}

	// No valid authentication found
	if (!userId) {
		throw error(401, {
			message:
				'Authentication required. Provide either a valid session or API key in Authorization header.'
		});
	}

	// Ensure user exists in database (sync from Clerk if needed)
	await ensureUser(userId);

	return userId;
}

/**
 * Optional API authentication - returns userId if authenticated, null otherwise
 * Does not throw error
 * Ensures user exists in database if authenticated
 */
export async function optionalApiAuth(event: RequestEvent): Promise<string | null> {
	let userId: string | null = null;

	// Try Clerk session auth (if available)
	if (event.locals.auth && typeof event.locals.auth === 'function') {
		const auth = event.locals.auth() || {};
		if (auth.userId) {
			userId = auth.userId;
		}
	}

	// Try API key from Authorization header
	if (!userId) {
		const authHeader = event.request.headers.get('Authorization');
		if (authHeader) {
			const match = authHeader.match(/^Bearer\s+(.+)$/i);
			if (match) {
				const apiKey = match[1];
				userId = await verifyApiKey(apiKey);
			}
		}
	}

	// Also try x-api-key header (legacy support)
	if (!userId) {
		const apiKeyHeader = event.request.headers.get('x-api-key');
		if (apiKeyHeader) {
			userId = await verifyApiKey(apiKeyHeader);
		}
	}

	// Ensure user exists in database if authenticated
	if (userId) {
		await ensureUser(userId);
	}

	return userId;
}
