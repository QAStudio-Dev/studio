import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { verifyApiKey } from './api-keys';

/**
 * Authenticate API request with either Clerk session or API key
 * Returns userId if authenticated, throws error otherwise
 */
export async function requireApiAuth(event: RequestEvent): Promise<string> {
	// First try Clerk session auth (if available)
	if (event.locals.auth && typeof event.locals.auth === 'function') {
		const { userId } = event.locals.auth() || {};
		if (userId) {
			return userId;
		}
	}

	// Try API key from Authorization header
	const authHeader = event.request.headers.get('Authorization');
	if (authHeader) {
		const match = authHeader.match(/^Bearer\s+(.+)$/i);
		if (match) {
			const apiKey = match[1];
			const userId = await verifyApiKey(apiKey);
			if (userId) {
				return userId;
			}
		}
	}

	// Also try x-api-key header (legacy support)
	const apiKeyHeader = event.request.headers.get('x-api-key');
	if (apiKeyHeader) {
		const userId = await verifyApiKey(apiKeyHeader);
		if (userId) {
			return userId;
		}
	}

	// No valid authentication found
	throw error(401, {
		message:
			'Authentication required. Provide either a valid session or API key in Authorization header.'
	});
}

/**
 * Optional API authentication - returns userId if authenticated, null otherwise
 * Does not throw error
 */
export async function optionalApiAuth(event: RequestEvent): Promise<string | null> {
	// Try Clerk session auth (if available)
	if (event.locals.auth && typeof event.locals.auth === 'function') {
		const { userId } = event.locals.auth() || {};
		if (userId) {
			return userId;
		}
	}

	// Try API key from Authorization header
	const authHeader = event.request.headers.get('Authorization');
	if (authHeader) {
		const match = authHeader.match(/^Bearer\s+(.+)$/i);
		if (match) {
			const apiKey = match[1];
			return await verifyApiKey(apiKey);
		}
	}

	// Also try x-api-key header (legacy support)
	const apiKeyHeader = event.request.headers.get('x-api-key');
	if (apiKeyHeader) {
		return await verifyApiKey(apiKeyHeader);
	}

	return null;
}
