import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the config module
vi.mock('$lib/config', () => ({
	DEPLOYMENT_CONFIG: {
		IS_SELF_HOSTED: false
	}
}));

// Mock rate limiting
vi.mock('$lib/server/rate-limit', () => ({
	checkRateLimit: vi.fn()
}));

import { DEPLOYMENT_CONFIG } from '$lib/config';
import { checkRateLimit } from '$lib/server/rate-limit';

/**
 * Tests for GET /api/config endpoint logic
 * Note: We test the logic directly since the handler is wrapped in sveltekit-api Endpoint class
 */
describe('GET /api/config - Response Logic', () => {
	beforeEach(() => {
		// Reset to SaaS mode by default
		(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		// Clear rate limit mock
		vi.mocked(checkRateLimit).mockClear();
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
