import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { hashPassword } from '$lib/server/crypto';
import { createSession, setSessionCookie, verifyCsrfToken } from '$lib/server/sessions';
import { Ratelimit } from '@upstash/ratelimit';
import { redis, isCacheEnabled } from '$lib/server/redis';
import { createAuditLog } from '$lib/server/audit';
import { sendWelcomeEmail } from '$lib/server/email';
import { RATE_LIMIT_CONFIG } from '$lib/config';

/**
 * Rate limiting for signup attempts
 * Uses Redis in production, falls back to in-memory for development
 */
let ratelimit: Ratelimit | null = null;
const signupAttemptsMemory = new Map<string, { count: number; resetAt: number }>();

// Initialize rate limiter if Redis is available
if (isCacheEnabled) {
	ratelimit = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(
			RATE_LIMIT_CONFIG.SIGNUP_MAX_ATTEMPTS,
			`${RATE_LIMIT_CONFIG.SIGNUP_WINDOW_HOURS * 60} m`
		),
		analytics: true,
		prefix: 'ratelimit:signup'
	});
}

/**
 * Clean up expired entries from in-memory rate limiter
 * Prevents memory leaks by removing entries past their reset time
 */
function cleanupExpiredSignupEntries() {
	const now = Date.now();
	for (const [email, attempt] of signupAttemptsMemory.entries()) {
		if (now > attempt.resetAt) {
			signupAttemptsMemory.delete(email);
		}
	}
}

// Periodic cleanup of expired entries (singleton pattern to prevent multiple intervals)
let cleanupInterval: NodeJS.Timeout | null = null;
if (!isCacheEnabled && !cleanupInterval) {
	cleanupInterval = setInterval(
		cleanupExpiredSignupEntries,
		RATE_LIMIT_CONFIG.CLEANUP_INTERVAL_MS
	);
}

async function checkRateLimit(email: string): Promise<boolean> {
	// Use Redis rate limiting if available
	if (ratelimit) {
		const { success } = await ratelimit.limit(email.toLowerCase());
		return success;
	}

	// Fallback to in-memory rate limiting for development
	const now = Date.now();
	const attempt = signupAttemptsMemory.get(email);

	if (!attempt || now > attempt.resetAt) {
		// Clean up this entry if expired
		if (attempt && now > attempt.resetAt) {
			signupAttemptsMemory.delete(email);
		}

		// Reset or create new entry
		signupAttemptsMemory.set(email, {
			count: 1,
			resetAt: now + RATE_LIMIT_CONFIG.SIGNUP_WINDOW_HOURS * 60 * 60 * 1000
		});
		return true;
	}

	if (attempt.count >= RATE_LIMIT_CONFIG.SIGNUP_MAX_ATTEMPTS) {
		// Too many attempts
		return false;
	}

	// Increment count
	attempt.count++;
	return true;
}

export const POST: RequestHandler = async (event) => {
	try {
		const {
			email,
			password,
			firstName,
			lastName,
			csrfToken: submittedCsrfToken
		} = await event.request.json();

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

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw error(400, {
				message: 'Invalid email format'
			});
		}

		// Validate password strength (minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number)
		if (password.length < 8) {
			throw error(400, {
				message: 'Password must be at least 8 characters long'
			});
		}

		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
		if (!passwordRegex.test(password)) {
			throw error(400, {
				message:
					'Password must contain at least one uppercase letter, one lowercase letter, and one number'
			});
		}

		// Check rate limit
		const rateLimitOk = await checkRateLimit(email.trim().toLowerCase());
		if (!rateLimitOk) {
			// Audit rate limit exceeded
			await createAuditLog({
				userId: 'anonymous',
				action: 'RATE_LIMIT_EXCEEDED',
				resourceType: 'Authentication',
				metadata: {
					email: email.trim().toLowerCase(),
					endpoint: '/api/auth/signup'
				},
				event
			});
			throw error(429, {
				message: 'Too many signup attempts. Please try again in 1 hour.'
			});
		}

		// Check if user already exists
		const existingUser = await db.user.findUnique({
			where: { email: email.trim().toLowerCase() }
		});

		if (existingUser) {
			throw error(409, {
				message: 'An account with this email already exists'
			});
		}

		// Hash password using bcrypt
		const passwordHash = await hashPassword(password);

		// Create user
		const user = await db.user.create({
			data: {
				email: email.trim().toLowerCase(),
				passwordHash,
				firstName: firstName || null,
				lastName: lastName || null,
				role: 'TESTER', // Default role
				emailVerified: false // Set to true if you don't require email verification
			}
		});

		// Create session
		const { sessionId, token, csrfToken } = await createSession(user.id);

		// Set session cookie
		setSessionCookie(event, sessionId, token, csrfToken);

		// Audit successful signup
		await createAuditLog({
			userId: user.id,
			action: 'USER_CREATED',
			resourceType: 'User',
			resourceId: user.id,
			metadata: {
				email: user.email,
				role: user.role
			},
			event
		});

		// Send welcome email (async, don't wait)
		const userName =
			firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : undefined;
		sendWelcomeEmail({
			to: user.email,
			name: userName
		}).catch((error) => {
			console.error('Failed to send welcome email:', error);
			// Don't fail signup if email fails
		});

		// Return user data (excluding password hash)
		return json({
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Signup error:', err);
		throw error(500, {
			message: 'An error occurred during signup'
		});
	}
};
