import { KV_REST_API_URL, KV_REST_API_TOKEN } from '$env/static/private';
import { Redis } from '@upstash/redis';
import { dev } from '$app/environment';

// Validate Redis environment variables
if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
	if (dev) {
		console.warn(
			'[Redis] Environment variables not set - caching disabled. Add KV_REST_API_URL and KV_REST_API_TOKEN to .env'
		);
	} else {
		throw new Error(
			'Redis environment variables (KV_REST_API_URL, KV_REST_API_TOKEN) are required in production'
		);
	}
}

// Initialize Redis client
export const redis = new Redis({
	url: KV_REST_API_URL || '',
	token: KV_REST_API_TOKEN || ''
});

// Flag to check if caching is enabled
export const isCacheEnabled = !!(KV_REST_API_URL && KV_REST_API_TOKEN);

/**
 * Cache key prefixes for different data types
 */
export const CacheKeys = {
	project: (id: string) => `project:${id}`,
	projects: (userId: string) => `projects:user:${userId}`,
	testRun: (id: string) => `run:${id}`,
	testResult: (id: string) => `result:${id}`,
	testResults: (runId: string) => `results:run:${runId}`,
	testCase: (id: string) => `case:${id}`,
	testSuite: (id: string) => `suite:${id}`,
	apiKey: (key: string) => `apikey:${key}`
} as const;

/**
 * Default TTL (time-to-live) values in seconds
 */
export const CacheTTL = {
	project: 300, // 5 minutes
	testRun: 180, // 3 minutes
	testResult: 300, // 5 minutes
	testCase: 600, // 10 minutes
	apiKey: 300 // 5 minutes
} as const;

/**
 * Get cached data
 * Note: @upstash/redis handles JSON deserialization automatically
 */
export async function getCache<T>(key: string): Promise<T | null> {
	if (!isCacheEnabled) return null;

	try {
		const data = await redis.get<T>(key);
		return data;
	} catch (error) {
		console.error('Redis get error:', error);
		return null;
	}
}

/**
 * Set cached data with TTL
 * Note: @upstash/redis handles JSON serialization automatically
 */
export async function setCache<T>(key: string, data: T, ttl?: number): Promise<boolean> {
	if (!isCacheEnabled) return false;

	try {
		if (ttl) {
			await redis.setex(key, ttl, data);
		} else {
			await redis.set(key, data);
		}
		return true;
	} catch (error) {
		console.error('Redis set error:', error);
		return false;
	}
}

/**
 * Delete cached data
 */
export async function deleteCache(key: string | string[]): Promise<boolean> {
	try {
		if (Array.isArray(key)) {
			await redis.del(...key);
		} else {
			await redis.del(key);
		}
		return true;
	} catch (error) {
		console.error('Redis del error:', error);
		return false;
	}
}

/**
 * Delete all cache keys matching a pattern
 * Uses SCAN instead of KEYS to avoid blocking Redis
 */
export async function deleteCachePattern(pattern: string): Promise<boolean> {
	if (!isCacheEnabled) return false;

	try {
		const keysToDelete: string[] = [];
		let cursor: string | number = 0;

		// Use SCAN to iterate through keys without blocking
		do {
			const result: [string | number, string[]] = await redis.scan(cursor, {
				match: pattern,
				count: 100
			});
			cursor = result[0];
			keysToDelete.push(...result[1]);
		} while (cursor !== 0 && cursor !== '0');

		// Delete all matched keys
		if (keysToDelete.length > 0) {
			await redis.del(...keysToDelete);
		}

		return true;
	} catch (error) {
		console.error('Redis pattern delete error:', error);
		return false;
	}
}

/**
 * Check if a key exists in cache
 */
export async function hasCache(key: string): Promise<boolean> {
	try {
		const exists = await redis.exists(key);
		return exists === 1;
	} catch (error) {
		console.error('Redis exists error:', error);
		return false;
	}
}

/**
 * Get or set pattern: Try to get from cache, if not found, fetch from DB and cache
 */
export async function getCachedOrFetch<T>(
	key: string,
	fetchFn: () => Promise<T>,
	ttl?: number
): Promise<T> {
	// Try to get from cache first
	const cached = await getCache<T>(key);
	if (cached !== null) {
		return cached;
	}

	// Fetch from database
	const data = await fetchFn();

	// Cache the result
	await setCache(key, data, ttl);

	return data;
}
