/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Encryption key must be exactly 64 hex characters (32 bytes) for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Example/test keys that should never be used in production
const INSECURE_KEYS = [
	'0000000000000000000000000000000000000000000000000000000000000000',
	'1111111111111111111111111111111111111111111111111111111111111111',
	'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
	'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
	'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
	'cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe'
];

/**
 * Validate and parse the encryption key
 * @throws Error if key is invalid or insecure
 */
function getValidatedKey(): Buffer {
	if (!ENCRYPTION_KEY) {
		throw new Error(
			'ENCRYPTION_KEY environment variable is not set. Generate one with: openssl rand -hex 32'
		);
	}

	// Key must be exactly 64 hex characters (32 bytes)
	if (!/^[0-9a-f]{64}$/i.test(ENCRYPTION_KEY)) {
		throw new Error(
			'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). ' +
				'Current length: ' +
				ENCRYPTION_KEY.length +
				'. Generate a valid key with: openssl rand -hex 32'
		);
	}

	// Prevent use of example/default keys in production
	if (process.env.NODE_ENV === 'production') {
		const normalizedKey = ENCRYPTION_KEY.toLowerCase();
		if (INSECURE_KEYS.includes(normalizedKey)) {
			throw new Error(
				'ENCRYPTION_KEY appears to be an example/test key and cannot be used in production. ' +
					'Generate a secure key with: openssl rand -hex 32'
			);
		}

		// Additional check: key should have reasonable entropy (not all same character)
		const uniqueChars = new Set(normalizedKey).size;
		if (uniqueChars < 8) {
			throw new Error(
				'ENCRYPTION_KEY has insufficient entropy (too few unique characters). ' +
					'Generate a secure key with: openssl rand -hex 32'
			);
		}
	}

	return Buffer.from(ENCRYPTION_KEY, 'hex');
}

// Validate key on module load to fail fast in all environments
const encryptionKey: Buffer = getValidatedKey();

/**
 * Encrypt sensitive text using AES-256-GCM
 * Returns format: iv:authTag:encryptedData (all hex-encoded)
 */
export function encrypt(text: string): string {
	try {
		// Generate random IV (12 bytes for GCM)
		const iv = randomBytes(12);

		// Create cipher
		const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);

		// Encrypt data
		let encrypted = cipher.update(text, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		// Get auth tag
		const authTag = cipher.getAuthTag().toString('hex');

		// Return format: iv:authTag:encryptedData
		return `${iv.toString('hex')}:${authTag}:${encrypted}`;
	} catch (error) {
		console.error('Encryption failed:', error);
		throw new Error('Failed to encrypt data');
	}
}

/**
 * Decrypt text that was encrypted with encrypt()
 * @param encryptedText - Encrypted string in format iv:authTag:encryptedData
 * @param options - Decryption options
 * @param options.strict - If true, throws error on unencrypted data (recommended for production)
 */
export function decrypt(encryptedText: string, options: { strict?: boolean } = {}): string {
	const { strict = process.env.NODE_ENV === 'production' } = options;

	// Check if data is encrypted (has the iv:authTag:data format)
	const parts = encryptedText.split(':');
	if (parts.length !== 3) {
		if (strict) {
			throw new Error(
				'Data is not encrypted. In production, all sensitive data must be encrypted.'
			);
		}
		// Backward compatibility: assume plain text (only for development/migration)
		console.warn(
			'Data appears to be unencrypted - returning as plain text (strict mode disabled)'
		);
		return encryptedText;
	}

	try {
		const [ivHex, authTagHex, encrypted] = parts;

		// Convert from hex
		const iv = Buffer.from(ivHex, 'hex');
		const authTag = Buffer.from(authTagHex, 'hex');

		// Create decipher
		const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
		decipher.setAuthTag(authTag);

		// Decrypt data
		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
		console.error('Decryption failed:', error);
		throw new Error('Failed to decrypt data');
	}
}

/**
 * Check if a string appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
	const parts = text.split(':');
	return parts.length === 3 && parts.every((part) => /^[0-9a-f]+$/i.test(part));
}
