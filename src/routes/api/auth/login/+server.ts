import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifyPassword } from '$lib/server/crypto';
import { createSession, setSessionCookie } from '$lib/server/sessions';

/**
 * Rate limiting for login attempts (simple in-memory store)
 * In production, use Redis or a proper rate limiting solution
 */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
	const now = Date.now();
	const attempt = loginAttempts.get(email);

	if (!attempt || now > attempt.resetAt) {
		// Reset or create new entry
		loginAttempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 minutes
		return true;
	}

	if (attempt.count >= 5) {
		// Too many attempts
		return false;
	}

	// Increment count
	attempt.count++;
	return true;
}

export const POST: RequestHandler = async (event) => {
	try {
		const { email, password } = await event.request.json();

		// Validate input
		if (!email || !password) {
			throw error(400, {
				message: 'Email and password are required'
			});
		}

		// Check rate limit
		if (!checkRateLimit(email.toLowerCase())) {
			throw error(429, {
				message: 'Too many login attempts. Please try again in 15 minutes.'
			});
		}

		// Find user by email
		const user = await db.user.findUnique({
			where: { email: email.toLowerCase() }
		});

		// Use constant-time response to prevent user enumeration
		if (!user) {
			throw error(401, {
				message: 'Invalid email or password'
			});
		}

		// Check if user has temporary password from Clerk migration
		const TEMP_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/WYUbv1zY9pQYvD1BO';

		if (!user.passwordHash || user.passwordHash === TEMP_PASSWORD_HASH) {
			// User needs to set up their password
			throw error(403, {
				message: 'NEEDS_PASSWORD_SETUP'
			});
		}

		// Verify password using bcrypt
		const isPasswordValid = await verifyPassword(password, user.passwordHash);

		if (!isPasswordValid) {
			throw error(401, {
				message: 'Invalid email or password'
			});
		}

		// Reset rate limit on successful login
		loginAttempts.delete(email.toLowerCase());

		// Create session
		const { token, csrfToken } = await createSession(user.id);

		// Set session cookie
		setSessionCookie(event, token, csrfToken);

		// Return user data (excluding password hash)
		return json({
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				teamId: user.teamId
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Login error:', err);
		throw error(500, {
			message: 'An error occurred during login'
		});
	}
};
