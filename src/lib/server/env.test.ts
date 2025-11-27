import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnvironment, getSessionSecret, getResetSecret, generateSecret } from './env';

describe('env', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset environment before each test
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv;
	});

	describe('getSessionSecret', () => {
		it('should return SESSION_SECRET from environment in production', () => {
			process.env.NODE_ENV = 'production';
			process.env.SESSION_SECRET = 'my-production-secret';

			const secret = getSessionSecret();
			expect(secret).toBe('my-production-secret');
		});

		it('should throw error if SESSION_SECRET not set in production', () => {
			process.env.NODE_ENV = 'production';
			delete process.env.SESSION_SECRET;

			expect(() => getSessionSecret()).toThrow(
				'Missing required environment variable: SESSION_SECRET'
			);
		});

		it('should use default in development', () => {
			process.env.NODE_ENV = 'development';
			delete process.env.SESSION_SECRET;

			const secret = getSessionSecret();
			expect(secret).toBe('dev-secret-change-in-production');
		});

		it('should accept actual value in production (not default)', () => {
			process.env.NODE_ENV = 'production';
			process.env.SESSION_SECRET = 'my-secure-production-secret';

			const secret = getSessionSecret();
			expect(secret).toBe('my-secure-production-secret');
		});
	});

	describe('getResetSecret', () => {
		it('should return RESET_SECRET if set', () => {
			process.env.RESET_SECRET = 'my-reset-secret';
			process.env.SESSION_SECRET = 'my-session-secret';

			const secret = getResetSecret();
			expect(secret).toBe('my-reset-secret');
		});

		it('should fall back to SESSION_SECRET if RESET_SECRET not set', () => {
			delete process.env.RESET_SECRET;
			process.env.SESSION_SECRET = 'my-session-secret';

			const secret = getResetSecret();
			expect(secret).toBe('my-session-secret');
		});

		it('should throw if neither RESET_SECRET nor SESSION_SECRET set in production', () => {
			process.env.NODE_ENV = 'production';
			delete process.env.RESET_SECRET;
			delete process.env.SESSION_SECRET;

			expect(() => getResetSecret()).toThrow();
		});
	});

	describe('validateEnvironment', () => {
		it('should not throw if all required variables are set in production', () => {
			process.env.NODE_ENV = 'production';
			process.env.SESSION_SECRET = 'my-production-secret';

			expect(() => validateEnvironment()).not.toThrow();
		});

		it('should throw if SESSION_SECRET missing in production', () => {
			process.env.NODE_ENV = 'production';
			delete process.env.SESSION_SECRET;

			expect(() => validateEnvironment()).toThrow();
		});

		it('should not throw in development with defaults', () => {
			process.env.NODE_ENV = 'development';
			delete process.env.SESSION_SECRET;
			delete process.env.RESET_SECRET;

			expect(() => validateEnvironment()).not.toThrow();
		});
	});

	describe('generateSecret', () => {
		it('should generate a base64 string', () => {
			const secret = generateSecret(32);

			expect(secret).toBeTruthy();
			expect(typeof secret).toBe('string');
			expect(secret.length).toBeGreaterThan(0);
		});

		it('should generate different secrets each time', () => {
			const secret1 = generateSecret(32);
			const secret2 = generateSecret(32);

			expect(secret1).not.toBe(secret2);
		});

		it('should generate longer secrets for larger byte counts', () => {
			const secret16 = generateSecret(16);
			const secret32 = generateSecret(32);

			expect(secret32.length).toBeGreaterThan(secret16.length);
		});
	});
});
