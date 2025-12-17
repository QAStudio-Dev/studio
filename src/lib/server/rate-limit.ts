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
 * Rate limit result with metadata for headers
 */
export interface RateLimitResult {
	/** Whether the request is allowed */
	success: boolean;
	/** Maximum requests allowed in window */
	limit: number;
	/** Remaining requests in current window */
	remaining: number;
	/** Timestamp when the rate limit resets (Unix timestamp in ms) */
	reset: number;
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
 * Check rate limit for a given key (throws on exceeded)
 * Uses Redis in production, falls back to in-memory for development
 *
 * @throws error(429) if rate limit exceeded
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<void> {
	const result = await checkRateLimitWithInfo(config);

	if (!result.success) {
		const resetDate = new Date(result.reset);
		throw error(429, `Rate limit exceeded. Try again after ${resetDate.toISOString()}`);
	}
}

/**
 * Check rate limit and return detailed information for headers
 * Uses Redis in production, falls back to in-memory for development
 *
 * @returns RateLimitResult with success status and metadata
 */
export async function checkRateLimitWithInfo(config: RateLimitConfig): Promise<RateLimitResult> {
	const { key, limit, window, prefix = 'ratelimit' } = config;

	// Use Redis rate limiting if available
	if (isCacheEnabled) {
		const ratelimit = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(limit, `${window} s`),
			analytics: true,
			prefix
		});

		const { success, remaining, reset } = await ratelimit.limit(key);

		return {
			success,
			limit,
			remaining,
			reset
		};
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
		const resetAt = now + windowMs;
		rateLimitMemory.set(fullKey, { count: 1, resetAt });
		return {
			success: true,
			limit,
			remaining: limit - 1,
			reset: resetAt
		};
	}

	if (attempt.count >= limit) {
		// Too many attempts
		return {
			success: false,
			limit,
			remaining: 0,
			reset: attempt.resetAt
		};
	}

	// Increment count
	attempt.count++;
	rateLimitMemory.set(fullKey, attempt);

	return {
		success: true,
		limit,
		remaining: limit - attempt.count,
		reset: attempt.resetAt
	};
}
