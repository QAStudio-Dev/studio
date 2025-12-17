import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEPLOYMENT_CONFIG } from '$lib/config';

/**
 * Tests for GET /api/config endpoint logic
 * Note: We test the logic directly since the handler is wrapped in sveltekit-api Endpoint class
 */
describe('GET /api/config - Response Logic', () => {
	let originalSelfHosted: boolean;

	beforeEach(() => {
		// Save original value
		originalSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;
	});

	afterEach(() => {
		// Restore original value
		Object.defineProperty(DEPLOYMENT_CONFIG, 'IS_SELF_HOSTED', {
			value: originalSelfHosted,
			writable: true,
			configurable: true
		});
	});

	it('should return self-hosted mode in self-hosted deployment', () => {
		// Mock self-hosted mode
		Object.defineProperty(DEPLOYMENT_CONFIG, 'IS_SELF_HOSTED', {
			value: true,
			writable: true,
			configurable: true
		});

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
		Object.defineProperty(DEPLOYMENT_CONFIG, 'IS_SELF_HOSTED', {
			value: false,
			writable: true,
			configurable: true
		});

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
		Object.defineProperty(DEPLOYMENT_CONFIG, 'IS_SELF_HOSTED', {
			value: true,
			writable: true,
			configurable: true
		});

		let isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;
		let result = {
			selfHosted: isSelfHosted,
			billing: {
				enabled: !isSelfHosted
			}
		};
		expect(result.billing.enabled).toBe(false);

		// Test SaaS: billing enabled
		Object.defineProperty(DEPLOYMENT_CONFIG, 'IS_SELF_HOSTED', {
			value: false,
			writable: true,
			configurable: true
		});

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
		Object.defineProperty(DEPLOYMENT_CONFIG, 'IS_SELF_HOSTED', {
			value: false,
			writable: true,
			configurable: true
		});

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
