import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

/**
 * Current encryption key version
 * Increment this when rotating keys
 */
const CURRENT_KEY_VERSION = 1;

/**
 * Get encryption key for a specific version
 * Supports multiple keys for rotation scenarios
 */
function getEncryptionKey(version: number = CURRENT_KEY_VERSION): string {
	// Primary key (current version)
	if (version === 1) {
		const key = env.TOTP_ENCRYPTION_KEY;
		if (!key) {
			throw new Error(
				'TOTP_ENCRYPTION_KEY environment variable is not set. Generate with: openssl rand -hex 32'
			);
		}

		// Validate key is exactly 64 hex characters (32 bytes for AES-256)
		if (!/^[0-9a-f]{64}$/i.test(key)) {
			throw new Error(
				'TOTP_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). Generate with: openssl rand -hex 32'
			);
		}

		return key;
	}

	// During key rotation, you can add old keys here for backward compatibility
	// Example for version 2 (new key):
	// if (version === 2) {
	//   const key = env.TOTP_ENCRYPTION_KEY_V2;
	//   if (!key) throw new Error('TOTP_ENCRYPTION_KEY_V2 not set');
	//   return key;
	// }

	throw new Error(`Unsupported encryption key version: ${version}`);
}

/**
 * Encrypt a TOTP secret for storage
 * Uses AES-256-CBC encryption with key versioning
 * Format: v{version}:{iv}:{encrypted}
 */
export function encryptTOTPSecret(secret: string): string {
	const key = getEncryptionKey(CURRENT_KEY_VERSION);
	const iv = randomBytes(16);

	const cipher = createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
	let encrypted = cipher.update(secret, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	// Store version, IV, and encrypted data (v{version}:{iv}:{encrypted})
	return `v${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a stored TOTP secret
 * Supports both legacy format (iv:encrypted) and versioned format (v{version}:iv:encrypted)
 */
export function decryptTOTPSecret(encryptedData: string): string {
	try {
		let version = 1; // Default to version 1 for legacy data
		let ivHex: string;
		let encrypted: string;

		// Check if data has version prefix
		if (encryptedData.startsWith('v')) {
			const parts = encryptedData.split(':');
			if (parts.length !== 3) {
				throw new Error('Invalid encrypted data format');
			}

			// Parse version from "v1" -> 1
			version = parseInt(parts[0].substring(1), 10);
			if (isNaN(version)) {
				throw new Error('Invalid version in encrypted data');
			}

			ivHex = parts[1];
			encrypted = parts[2];
		} else {
			// Legacy format: iv:encrypted (assume version 1)
			const parts = encryptedData.split(':');
			if (parts.length !== 2) {
				throw new Error('Invalid encrypted data format');
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
		const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
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
