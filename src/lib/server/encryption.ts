/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Encryption key must be exactly 64 hex characters (32 bytes) for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Validate and parse the encryption key
 * @throws Error if key is invalid
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
 */
export function decrypt(encryptedText: string): string {
	// Check if data is encrypted (has the iv:authTag:data format)
	const parts = encryptedText.split(':');
	if (parts.length !== 3) {
		// Assume it's plain text (for backward compatibility with existing data)
		console.warn('Data appears to be unencrypted - returning as plain text');
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
