import { Ratelimit } from '@upstash/ratelimit';
import { redis, isCacheEnabled } from '$lib/server/redis';
import { error } from 'sveltekit-api';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
	/** Unique key for this rate limit (e.g., 'twilio_sms:team123') */
	key: string;
	/** Maximum number of requests allowed in the window */
	limit: number;
	/** Time window in seconds */
	window: number;
	/** Optional prefix for the rate limit key */
	prefix?: string;
}

/**
 * In-memory fallback for development when Redis is not available
 *
 * ⚠️ WARNING: This in-memory implementation is NOT suitable for production use:
 * - Not atomic: Race conditions can occur under concurrent requests
 * - Not distributed: Doesn't work across multiple server instances
 * - Not persistent: Resets on server restart
 *
 * For production, ensure Redis is configured (via UPSTASH_REDIS_REST_URL env var).
 * Redis provides atomic operations via Lua scripts and distributed state management.
 */
const rateLimitMemory = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for a given key
 * Uses Redis in production, falls back to in-memory for development
 *
 * @throws error(429) if rate limit exceeded
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<void> {
	const { key, limit, window, prefix = 'ratelimit' } = config;

	// Use Redis rate limiting if available
	if (isCacheEnabled) {
		const ratelimit = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(limit, `${window} s`),
			analytics: true,
			prefix
		});

		const { success, reset } = await ratelimit.limit(key);

		if (!success) {
			const resetDate = new Date(reset);
			throw error(429, `Rate limit exceeded. Try again after ${resetDate.toISOString()}`);
		}

		return;
	}

	// Fallback to in-memory rate limiting for development
	console.warn(
		'⚠️  [Rate Limit] Using in-memory fallback (NOT production-safe). Configure Redis via UPSTASH_REDIS_REST_URL for production.'
	);

	const now = Date.now();
	const fullKey = `${prefix}:${key}`;
	const attempt = rateLimitMemory.get(fullKey);
	const windowMs = window * 1000;

	if (!attempt || now > attempt.resetAt) {
		// Reset or create new entry
		rateLimitMemory.set(fullKey, { count: 1, resetAt: now + windowMs });
		return;
	}

	if (attempt.count >= limit) {
		// Too many attempts
		const resetDate = new Date(attempt.resetAt);
		throw error(429, `Rate limit exceeded. Try again after ${resetDate.toISOString()}`);
	}

	// Increment count
	attempt.count++;
	rateLimitMemory.set(fullKey, attempt);
}
