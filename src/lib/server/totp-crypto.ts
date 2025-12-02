import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

/**
 * Encryption key for TOTP secrets
 * MUST be set in environment variables
 */
function getEncryptionKey(): string {
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

/**
 * Encrypt a TOTP secret for storage
 * Uses AES-256-CBC encryption
 */
export function encryptTOTPSecret(secret: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(16);

	const cipher = createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
	let encrypted = cipher.update(secret, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	// Store IV with encrypted data (IV:encrypted)
	return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a stored TOTP secret
 */
export function decryptTOTPSecret(encryptedData: string): string {
	try {
		const key = getEncryptionKey();
		const [ivHex, encrypted] = encryptedData.split(':');

		if (!ivHex || !encrypted) {
			throw new Error('Invalid encrypted data format');
		}

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
