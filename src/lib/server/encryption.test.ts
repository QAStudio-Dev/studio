import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';
import { encrypt, decrypt, isEncrypted } from './encryption';

describe('encryption', () => {
	// Note: encryption.ts validates the key on module load, so we can't easily test
	// invalid key scenarios without restructuring the module. Instead, we test the
	// functions assuming a valid key is already set.

	describe('encrypt/decrypt', () => {
		it('should encrypt and decrypt text correctly', () => {
			const plaintext = 'my-secret-api-token-12345';
			const encrypted = encrypt(plaintext);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(plaintext);
		});

		it('should produce different ciphertext for same plaintext', () => {
			const plaintext = 'test-token';
			const encrypted1 = encrypt(plaintext);
			const encrypted2 = encrypt(plaintext);

			// Should be different due to random IV
			expect(encrypted1).not.toBe(encrypted2);

			// But both should decrypt to same value
			expect(decrypt(encrypted1)).toBe(plaintext);
			expect(decrypt(encrypted2)).toBe(plaintext);
		});

		it('should encrypt special characters and unicode', () => {
			const plaintext = '🔐 Secret: "key"=\'value\' & <tag>';
			const encrypted = encrypt(plaintext);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(plaintext);
		});

		it('should encrypt long strings', () => {
			const plaintext = 'x'.repeat(10000);
			const encrypted = encrypt(plaintext);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(plaintext);
		});

		it('should return encrypted text in correct format', () => {
			const encrypted = encrypt('test');

			// Format: iv:authTag:encryptedData (all hex)
			const parts = encrypted.split(':');
			expect(parts).toHaveLength(3);
			expect(parts[0]).toMatch(/^[0-9a-f]+$/i); // IV
			expect(parts[1]).toMatch(/^[0-9a-f]+$/i); // Auth tag
			expect(parts[2]).toMatch(/^[0-9a-f]+$/i); // Encrypted data
		});

		it('should throw error when decrypting tampered ciphertext', () => {
			const encrypted = encrypt('test');
			const parts = encrypted.split(':');

			// Tamper with the encrypted data
			parts[2] = parts[2].substring(0, parts[2].length - 2) + 'ff';
			const tampered = parts.join(':');

			expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
		});

		it('should throw error when decrypting with wrong auth tag', () => {
			const encrypted = encrypt('test');
			const parts = encrypted.split(':');

			// Tamper with auth tag - flip all bits by XORing with ff
			const authTagBuf = Buffer.from(parts[1], 'hex');
			const tamperedAuthTag = Buffer.alloc(authTagBuf.length);
			for (let i = 0; i < authTagBuf.length; i++) {
				tamperedAuthTag[i] = authTagBuf[i] ^ 0xff;
			}
			parts[1] = tamperedAuthTag.toString('hex');
			const tampered = parts.join(':');

			expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
		});

		it('should handle backward compatibility with plaintext', () => {
			const plaintext = 'unencrypted-legacy-token';

			// Plaintext should be returned as-is with warning
			const result = decrypt(plaintext);
			expect(result).toBe(plaintext);
		});

		it('should detect encrypted format correctly', () => {
			const encrypted = encrypt('test');
			expect(isEncrypted(encrypted)).toBe(true);

			expect(isEncrypted('plaintext')).toBe(false);
			expect(isEncrypted('not:hex:zzz')).toBe(false); // Not valid hex
			expect(isEncrypted('abc:def:123')).toBe(true); // 3 parts, all hex
		});
	});

	describe('encryption security', () => {
		it('should use authenticated encryption (GCM)', () => {
			const encrypted = encrypt('test');
			const parts = encrypted.split(':');

			// Auth tag should be present and 32 hex chars (16 bytes)
			expect(parts[1]).toHaveLength(32);
		});

		it('should use random IV for each encryption', () => {
			const encrypted1 = encrypt('test');
			const encrypted2 = encrypt('test');

			const iv1 = encrypted1.split(':')[0];
			const iv2 = encrypted2.split(':')[0];

			// IVs should be different
			expect(iv1).not.toBe(iv2);

			// IVs should be 24 hex chars (12 bytes)
			expect(iv1).toHaveLength(24);
			expect(iv2).toHaveLength(24);
		});

		it('should not leak plaintext in encrypted output', () => {
			const plaintext = 'super-secret-password-12345';
			const encrypted = encrypt(plaintext);

			// Encrypted text should not contain any part of plaintext
			expect(encrypted.toLowerCase()).not.toContain(plaintext.toLowerCase());
			expect(encrypted).not.toContain('secret');
			expect(encrypted).not.toContain('password');
		});
	});

	describe('real-world integration scenarios', () => {
		it('should handle Jira API token encryption', () => {
			const jiraToken = 'ATATT3xFfGF0dH_example_token_12345';
			const encrypted = encrypt(jiraToken);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(jiraToken);
			expect(encrypted).not.toContain('ATATT');
		});

		it('should handle Slack webhook URL encryption', () => {
			const webhookUrl =
				'https://hooks.example.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX';
			const encrypted = encrypt(webhookUrl);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(webhookUrl);
			expect(encrypted).not.toContain('example.com');
		});

		it('should handle email encryption', () => {
			const email = 'user@example.com';
			const encrypted = encrypt(email);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(email);
		});

		it('should handle empty string', () => {
			const encrypted = encrypt('');
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe('');
		});
	});
});
