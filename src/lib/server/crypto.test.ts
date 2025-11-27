import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateToken } from './crypto';

describe('crypto', () => {
	describe('hashPassword', () => {
		it('should hash a password', async () => {
			const password = 'Password123';
			const hash = await hashPassword(password);

			expect(hash).toBeTruthy();
			expect(hash).not.toBe(password);
			expect(hash.startsWith('$2b$')).toBe(true); // bcrypt hash format
		});

		it('should generate different hashes for the same password (salting)', async () => {
			const password = 'Password123';
			const hash1 = await hashPassword(password);
			const hash2 = await hashPassword(password);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe('verifyPassword', () => {
		it('should verify a correct password', async () => {
			const password = 'Password123';
			const hash = await hashPassword(password);

			const isValid = await verifyPassword(password, hash);
			expect(isValid).toBe(true);
		});

		it('should reject an incorrect password', async () => {
			const password = 'Password123';
			const hash = await hashPassword(password);

			const isValid = await verifyPassword('WrongPassword', hash);
			expect(isValid).toBe(false);
		});

		it('should be case sensitive', async () => {
			const password = 'Password123';
			const hash = await hashPassword(password);

			const isValid = await verifyPassword('password123', hash);
			expect(isValid).toBe(false);
		});
	});

	describe('generateToken', () => {
		it('should generate a token of the specified length', () => {
			const token = generateToken(32);
			expect(token).toBeTruthy();
			expect(token.length).toBeGreaterThan(0);
		});

		it('should generate different tokens each time', () => {
			const token1 = generateToken(32);
			const token2 = generateToken(32);

			expect(token1).not.toBe(token2);
		});

		it('should generate URL-safe tokens', () => {
			const token = generateToken(32);
			// nanoid uses URL-safe characters: A-Za-z0-9_-
			expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		});
	});
});
