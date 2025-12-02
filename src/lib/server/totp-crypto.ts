import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getTOTPEncryptionKey } from './env';

/**
 * Current encryption key version
 * Increment this when rotating keys or changing encryption algorithm
 *
 * Version 1: AES-256-CBC (legacy, no authentication)
 * Version 2: AES-256-GCM (current, authenticated encryption)
 */
const CURRENT_KEY_VERSION = 2;

/**
 * Get encryption key for a specific version
 * Supports multiple keys for rotation scenarios
 */
function getEncryptionKey(version: number = CURRENT_KEY_VERSION): string {
	// Version 1: Legacy CBC encryption (backward compatibility)
	// Version 2: Current GCM encryption (same key, different algorithm)
	// Validation happens at startup via validateEnvironment() in env.ts
	if (version === 1 || version === 2) {
		return getTOTPEncryptionKey();
	}

	// During key rotation, you can add old keys here for backward compatibility
	// Example for version 3 (new key):
	// if (version === 3) {
	//   const key = process.env.TOTP_ENCRYPTION_KEY_V3;
	//   if (!key) throw new Error('TOTP_ENCRYPTION_KEY_V3 not set');
	//   if (!/^[0-9a-f]{64}$/i.test(key)) {
	//     throw new Error('Invalid TOTP_ENCRYPTION_KEY_V3 format');
	//   }
	//   return key;
	// }

	throw new Error(`Unsupported encryption key version: ${version}`);
}

/**
 * Encrypt a TOTP secret for storage
 * Uses AES-256-GCM authenticated encryption with key versioning
 *
 * IV Size Requirements:
 * - Version 1 (CBC): 16 bytes (128 bits) - standard for AES-CBC
 * - Version 2 (GCM): 12 bytes (96 bits) - NIST recommended for AES-GCM
 *
 * Format Versions:
 * - Version 1 format (legacy): v1:{iv(32 hex)}:{encrypted}
 * - Version 2 format (current): v2:{iv(24 hex)}:{encrypted}:{authTag(32 hex)}
 */
export function encryptTOTPSecret(secret: string): string {
	const key = getEncryptionKey(CURRENT_KEY_VERSION);
	const iv = randomBytes(12); // GCM: 12 bytes (24 hex chars) per NIST SP 800-38D

	// Use GCM mode for authenticated encryption
	const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
	let encrypted = cipher.update(secret, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	// Get authentication tag for integrity verification (16 bytes / 32 hex chars)
	const authTag = cipher.getAuthTag().toString('hex');

	// Store version, IV, encrypted data, and auth tag (v2:{iv}:{encrypted}:{authTag})
	return `v${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypt a stored TOTP secret
 * Supports multiple format versions for backward compatibility:
 *
 * - Legacy (no version): {iv(32 hex)}:{encrypted} - assumes v1/CBC with 16-byte IV
 * - Version 1: v1:{iv(32 hex)}:{encrypted} - AES-256-CBC (no auth) with 16-byte IV
 * - Version 2: v2:{iv(24 hex)}:{encrypted}:{authTag(32 hex)} - AES-256-GCM with 12-byte IV
 *
 * IV sizes are automatically handled based on the version detected.
 */
export function decryptTOTPSecret(encryptedData: string): string {
	try {
		let version = 1; // Default to version 1 for legacy data
		let ivHex: string;
		let encrypted: string;
		let authTagHex: string | undefined;

		// Check if data has version prefix
		if (encryptedData.startsWith('v')) {
			const parts = encryptedData.split(':');

			// Parse version from "v1" -> 1
			version = parseInt(parts[0].substring(1), 10);
			if (isNaN(version)) {
				throw new Error('Invalid version in encrypted data');
			}

			// Version 2 has auth tag (4 parts), version 1 doesn't (3 parts)
			if (version === 2) {
				if (parts.length !== 4) {
					throw new Error('Invalid v2 encrypted data format (expected 4 parts)');
				}
				ivHex = parts[1];
				encrypted = parts[2];
				authTagHex = parts[3];
			} else if (version === 1) {
				if (parts.length !== 3) {
					throw new Error('Invalid v1 encrypted data format (expected 3 parts)');
				}
				ivHex = parts[1];
				encrypted = parts[2];
			} else {
				throw new Error(`Unsupported encryption version: ${version}`);
			}
		} else {
			// Legacy format: iv:encrypted (assume version 1/CBC)
			const parts = encryptedData.split(':');
			if (parts.length !== 2) {
				throw new Error('Invalid legacy encrypted data format');
			}
			ivHex = parts[0];
			encrypted = parts[1];
		}

		if (!ivHex || !encrypted) {
			throw new Error('Invalid encrypted data format');
		}

		// Get the appropriate key for this version
		const key = getEncryptionKey(version);
		const iv = Buffer.from(ivHex, 'hex');

		let decrypted: string;

		// Version 2 uses GCM (authenticated encryption)
		if (version === 2 && authTagHex) {
			const authTag = Buffer.from(authTagHex, 'hex');
			const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
			decipher.setAuthTag(authTag);

			decrypted = decipher.update(encrypted, 'hex', 'utf8');
			decrypted += decipher.final('utf8');
		} else {
			// Version 1 uses CBC (no authentication)
			const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
			decrypted = decipher.update(encrypted, 'hex', 'utf8');
			decrypted += decipher.final('utf8');
		}

		return decrypted;
	} catch (error) {
		// Log decryption failure for security monitoring
		// Don't include the actual encrypted data in the log
		console.error('[SECURITY] TOTP decryption failed', {
			timestamp: new Date().toISOString(),
			errorType: error instanceof Error ? error.message : 'Unknown error',
			dataFormat: encryptedData.startsWith('v')
				? `versioned (${encryptedData.split(':')[0]})`
				: 'legacy',
			// Include first 10 chars for debugging without exposing full secret
			dataPrefix: encryptedData.substring(0, 10)
		});

		// Don't leak encrypted data details in error messages
		throw new Error('Failed to decrypt TOTP secret');
	}
}

/**
 * Re-encrypt a secret with the current key version
 * Used during key rotation to upgrade old secrets
 */
export function reencryptTOTPSecret(encryptedData: string): string {
	// Decrypt with old key
	const secret = decryptTOTPSecret(encryptedData);
	// Encrypt with current key
	return encryptTOTPSecret(secret);
}
