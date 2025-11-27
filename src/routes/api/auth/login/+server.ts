import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifyPassword } from '$lib/server/crypto';
import { createSession, setSessionCookie, verifyCsrfToken } from '$lib/server/sessions';
import { TEMP_PASSWORD_HASH } from '$lib/server/auth-constants';
import { Ratelimit } from '@upstash/ratelimit';
import { redis, isCacheEnabled } from '$lib/server/redis';

/**
 * Rate limiting for login attempts
 * Uses Redis in production, falls back to in-memory for development
 */
let ratelimit: Ratelimit | null = null;
const loginAttemptsMemory = new Map<string, { count: number; resetAt: number }>();

// Initialize rate limiter if Redis is available
if (isCacheEnabled) {
	ratelimit = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(5, '15 m'),
		analytics: true,
		prefix: 'ratelimit:login'
	});
}

async function checkRateLimit(email: string): Promise<boolean> {
	// Use Redis rate limiting if available
	if (ratelimit) {
		const { success } = await ratelimit.limit(email.toLowerCase());
		return success;
	}

	// Fallback to in-memory rate limiting for development
	const now = Date.now();
	const attempt = loginAttemptsMemory.get(email);

	if (!attempt || now > attempt.resetAt) {
		// Reset or create new entry
		loginAttemptsMemory.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 minutes
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
		const { email, password, csrfToken: submittedCsrfToken } = await event.request.json();

		// Validate CSRF token
		if (!submittedCsrfToken || !verifyCsrfToken(event, submittedCsrfToken)) {
			throw error(403, {
				message: 'Invalid CSRF token'
			});
		}

		// Validate input
		if (!email || !password) {
			throw error(400, {
				message: 'Email and password are required'
			});
		}

		// Check rate limit
		const rateLimitOk = await checkRateLimit(email.toLowerCase());
		if (!rateLimitOk) {
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
		if (ratelimit) {
			// Redis rate limiter resets automatically with sliding window
			await ratelimit.resetUsedTokens(email.toLowerCase());
		} else {
			// In-memory fallback
			loginAttemptsMemory.delete(email.toLowerCase());
		}

		// Create session
		const { sessionId, token, csrfToken } = await createSession(user.id);

		// Set session cookie
		setSessionCookie(event, sessionId, token, csrfToken);

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
