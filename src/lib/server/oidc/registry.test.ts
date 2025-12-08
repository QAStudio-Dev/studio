import { describe, it, expect } from 'vitest';
import { isValidProviderName } from './registry';

describe('OIDC Registry', () => {
	// Note: Most registry tests are skipped because they depend on environment variables,
	// database state, and module-level caching makes it difficult to test different
	// configurations in the same test suite without process isolation.
	//
	// Manual testing should cover:
	// - Provider returns when env vars are set
	// - Provider returns null when env vars are missing
	// - Provider caching works correctly (both env and database)
	// - getConfiguredProviders returns correct list
	// - Team-specific SSO configuration from database
	// - Email domain-based team detection
	//
	// These are better tested in integration tests or E2E tests

	describe('isValidProviderName', () => {
		it('should return true for okta', () => {
			expect(isValidProviderName('okta')).toBe(true);
		});

		it('should return true for google', () => {
			expect(isValidProviderName('google')).toBe(true);
		});

		it('should return false for invalid provider names', () => {
			expect(isValidProviderName('azure')).toBe(false);
			expect(isValidProviderName('facebook')).toBe(false);
			expect(isValidProviderName('')).toBe(false);
			expect(isValidProviderName('random')).toBe(false);
		});

		it('should be case-sensitive', () => {
			expect(isValidProviderName('Okta')).toBe(false);
			expect(isValidProviderName('GOOGLE')).toBe(false);
			expect(isValidProviderName('okTA')).toBe(false);
		});
	});

	describe('Provider configuration', () => {
		it.todo(
			'should return provider when env vars are configured (requires process isolation for testing)'
		);
		it.todo(
			'should return null when env vars are missing (requires process isolation for testing)'
		);
		it.todo('should cache provider instances (requires process isolation for testing)');
		it.todo(
			'should use correct callback URLs based on PUBLIC_BASE_URL (requires process isolation for testing)'
		);
		it.todo(
			'should list all configured providers correctly (requires process isolation for testing)'
		);
	});
});
