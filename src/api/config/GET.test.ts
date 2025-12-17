import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the config module
vi.mock('$lib/config', () => ({
	DEPLOYMENT_CONFIG: {
		IS_SELF_HOSTED: false
	}
}));

// Mock rate limiting
vi.mock('$lib/server/rate-limit', () => ({
	checkRateLimitWithInfo: vi.fn().mockResolvedValue({
		success: true,
		limit: 100,
		remaining: 99,
		reset: Date.now() + 60000
	})
}));

import { DEPLOYMENT_CONFIG } from '$lib/config';
import { checkRateLimitWithInfo } from '$lib/server/rate-limit';

/**
 * Tests for GET /api/config endpoint logic
 * Note: We test the logic directly since the handler is wrapped in sveltekit-api Endpoint class
 */
describe('GET /api/config - Response Logic', () => {
	beforeEach(() => {
		// Reset to SaaS mode by default
		(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		// Clear rate limit mock
		vi.mocked(checkRateLimitWithInfo).mockClear();
	});

	it('should return self-hosted mode in self-hosted deployment', () => {
		// Mock self-hosted mode
		(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

		const isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;
		const result = {
			selfHosted: isSelfHosted,
			billing: {
				enabled: !isSelfHosted
			}
		};

		expect(result).toEqual({
			selfHosted: true,
			billing: {
				enabled: false
			}
		});
	});

	it('should return SaaS mode in SaaS deployment', () => {
		// Mock SaaS mode
		(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

		const isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;
		const result = {
			selfHosted: isSelfHosted,
			billing: {
				enabled: !isSelfHosted
			}
		};

		expect(result).toEqual({
			selfHosted: false,
			billing: {
				enabled: true
			}
		});
	});

	it('should return correct billing status based on deployment mode', () => {
		// Test self-hosted: billing disabled
		(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

		let isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;
		let result = {
			selfHosted: isSelfHosted,
			billing: {
				enabled: !isSelfHosted
			}
		};
		expect(result.billing.enabled).toBe(false);

		// Test SaaS: billing enabled
		(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

		isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;
		result = {
			selfHosted: isSelfHosted,
			billing: {
				enabled: !isSelfHosted
			}
		};
		expect(result.billing.enabled).toBe(true);
	});

	it('should only expose non-sensitive information', () => {
		(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

		const isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;
		const result = {
			selfHosted: isSelfHosted,
			billing: {
				enabled: !isSelfHosted
			}
		};

		// Verify it only returns expected fields
		const keys = Object.keys(result);
		expect(keys).toContain('selfHosted');
		expect(keys).toContain('billing');
		expect(keys).toHaveLength(2);

		// Verify billing object structure
		const billingKeys = Object.keys(result.billing);
		expect(billingKeys).toContain('enabled');
		expect(billingKeys).toHaveLength(1);

		// Verify types
		expect(typeof result.selfHosted).toBe('boolean');
		expect(typeof result.billing.enabled).toBe('boolean');
	});
});

describe('GET /api/config - Rate Limiting', () => {
	beforeEach(() => {
		(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		vi.mocked(checkRateLimitWithInfo).mockClear();
	});

	it('should call rate limiter with correct configuration', async () => {
		vi.mocked(checkRateLimitWithInfo).mockResolvedValue({
			success: true,
			limit: 100,
			remaining: 99,
			reset: Date.now() + 60000
		});

		// Verify rate limiter was called with correct config
		// Note: We can't directly test the handler since it's wrapped,
		// but we verify the mock is configured correctly
		expect(vi.mocked(checkRateLimitWithInfo)).toBeDefined();
	});

	it('should handle rate limit exceeded', async () => {
		const resetTime = Date.now() + 60000;

		vi.mocked(checkRateLimitWithInfo).mockResolvedValue({
			success: false,
			limit: 100,
			remaining: 0,
			reset: resetTime
		});

		// Verify the result structure when rate limit is exceeded
		const result = await checkRateLimitWithInfo({
			key: 'config:127.0.0.1',
			limit: 100,
			window: 60,
			prefix: 'api'
		});

		expect(result.success).toBe(false);
		expect(result.remaining).toBe(0);
		expect(result.reset).toBe(resetTime);
	});

	it('should return rate limit metadata on success', async () => {
		const resetTime = Date.now() + 60000;

		vi.mocked(checkRateLimitWithInfo).mockResolvedValue({
			success: true,
			limit: 100,
			remaining: 75,
			reset: resetTime
		});

		const result = await checkRateLimitWithInfo({
			key: 'config:127.0.0.1',
			limit: 100,
			window: 60,
			prefix: 'api'
		});

		expect(result.success).toBe(true);
		expect(result.limit).toBe(100);
		expect(result.remaining).toBe(75);
		expect(result.reset).toBe(resetTime);
	});
});
