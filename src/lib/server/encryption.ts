/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Encryption key must be 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
	console.warn('ENCRYPTION_KEY not set - sensitive data will be stored unencrypted!');
}

/**
 * Encrypt sensitive text using AES-256-GCM
 * Returns format: iv:authTag:encryptedData (all hex-encoded)
 */
export function encrypt(text: string): string {
	if (!ENCRYPTION_KEY) {
		console.warn('Encryption key not configured - storing data in plain text');
		return text;
	}

	try {
		// Ensure key is exactly 32 bytes
		const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));

		// Generate random IV (12 bytes for GCM)
		const iv = randomBytes(12);

		// Create cipher
		const cipher = createCipheriv('aes-256-gcm', key, iv);

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
	if (!ENCRYPTION_KEY) {
		console.warn('Encryption key not configured - assuming plain text');
		return encryptedText;
	}

	// Check if data is encrypted (has the iv:authTag:data format)
	const parts = encryptedText.split(':');
	if (parts.length !== 3) {
		// Assume it's plain text (for backward compatibility)
		console.warn('Data appears to be unencrypted');
		return encryptedText;
	}

	try {
		const [ivHex, authTagHex, encrypted] = parts;

		// Ensure key is exactly 32 bytes
		const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));

		// Convert from hex
		const iv = Buffer.from(ivHex, 'hex');
		const authTag = Buffer.from(authTagHex, 'hex');

		// Create decipher
		const decipher = createDecipheriv('aes-256-gcm', key, iv);
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
