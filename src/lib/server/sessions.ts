import { db } from './db';
import { generateToken, hashToken, verifyToken } from './crypto';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Session configuration
 */
const SESSION_COOKIE_NAME = 'qa_studio_session';
const SESSION_EXPIRY_DAYS = 30; // Sessions expire after 30 days
const CSRF_TOKEN_COOKIE_NAME = 'qa_studio_csrf';

/**
 * Cookie options for secure session management
 */
const SECURE_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 // 30 days in seconds
};

/**
 * CSRF cookie options (not httpOnly so frontend can read it)
 */
const CSRF_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: false, // Frontend needs to read this
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60
};

/**
 * Create a new session for a user
 *
 * @param userId - ID of the user to create session for
 * @returns Object containing the session token and CSRF token
 */
export async function createSession(userId: string): Promise<{ token: string; csrfToken: string }> {
	// Generate session token
	const token = generateToken(32);
	const hashedToken = await hashToken(token);

	// Generate CSRF token
	const csrfToken = generateToken(32);

	// Calculate expiry date
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

	// Store session in database (with hashed token for security)
	await db.session.create({
		data: {
			userId,
			token: hashedToken,
			expiresAt
		}
	});

	return { token, csrfToken };
}

/**
 * Validate a session token and return the user ID
 *
 * @param token - Session token to validate
 * @returns User ID if session is valid, null otherwise
 */
export async function validateSession(token: string): Promise<string | null> {
	// Find all sessions (we need to check token hash)
	// Note: This is a limitation of bcrypt - we can't query by hash
	// In a high-traffic system, consider using a faster hash like SHA-256
	const sessions = await db.session.findMany({
		where: {
			expiresAt: {
				gt: new Date() // Only get non-expired sessions
			}
		},
		select: {
			id: true,
			userId: true,
			token: true
		}
	});

	// Find matching session by verifying token hash
	for (const session of sessions) {
		const isValid = await verifyToken(token, session.token);
		if (isValid) {
			return session.userId;
		}
	}

	return null;
}

/**
 * Delete a session (logout)
 *
 * @param token - Session token to delete
 */
export async function deleteSession(token: string): Promise<void> {
	// Find and delete the session
	const sessions = await db.session.findMany({
		where: {
			expiresAt: {
				gt: new Date()
			}
		}
	});

	// Find matching session and delete it
	for (const session of sessions) {
		const isValid = await verifyToken(token, session.token);
		if (isValid) {
			await db.session.delete({
				where: { id: session.id }
			});
			break;
		}
	}
}

/**
 * Delete all sessions for a user (logout from all devices)
 *
 * @param userId - User ID to delete sessions for
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
	await db.session.deleteMany({
		where: { userId }
	});
}

/**
 * Clean up expired sessions (run this periodically via cron job)
 */
export async function cleanupExpiredSessions(): Promise<void> {
	await db.session.deleteMany({
		where: {
			expiresAt: {
				lt: new Date()
			}
		}
	});
}

/**
 * Set session cookie in response
 *
 * @param event - SvelteKit request event
 * @param token - Session token to set
 * @param csrfToken - CSRF token to set
 */
export function setSessionCookie(event: RequestEvent, token: string, csrfToken: string): void {
	event.cookies.set(SESSION_COOKIE_NAME, token, SECURE_COOKIE_OPTIONS);
	event.cookies.set(CSRF_TOKEN_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);
}

/**
 * Get session token from request cookies
 *
 * @param event - SvelteKit request event
 * @returns Session token if present, null otherwise
 */
export function getSessionToken(event: RequestEvent): string | null {
	return event.cookies.get(SESSION_COOKIE_NAME) || null;
}

/**
 * Get CSRF token from request cookies
 *
 * @param event - SvelteKit request event
 * @returns CSRF token if present, null otherwise
 */
export function getCsrfToken(event: RequestEvent): string | null {
	return event.cookies.get(CSRF_TOKEN_COOKIE_NAME) || null;
}

/**
 * Clear session cookies (logout)
 *
 * @param event - SvelteKit request event
 */
export function clearSessionCookies(event: RequestEvent): void {
	event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	event.cookies.delete(CSRF_TOKEN_COOKIE_NAME, { path: '/' });
}

/**
 * Verify CSRF token from request
 *
 * @param event - SvelteKit request event
 * @param submittedToken - CSRF token from form/request
 * @returns True if CSRF token is valid, false otherwise
 */
export function verifyCsrfToken(event: RequestEvent, submittedToken: string): boolean {
	const cookieToken = getCsrfToken(event);
	return cookieToken === submittedToken;
}

/**
 * Get current user from session
 *
 * @param event - SvelteKit request event
 * @returns User ID if authenticated, null otherwise
 */
export async function getCurrentUser(event: RequestEvent): Promise<string | null> {
	const sessionToken = getSessionToken(event);
	if (!sessionToken) {
		return null;
	}

	return validateSession(sessionToken);
}
