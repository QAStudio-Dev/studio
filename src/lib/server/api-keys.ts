import crypto from 'crypto';
import { db } from './db';

/**
 * Generate a random API key with prefix
 * Format: qas_<32 random chars>
 */
export function generateApiKey(): string {
	const randomBytes = crypto.randomBytes(24);
	const key = `qas_${randomBytes.toString('base64url')}`;
	return key;
}

/**
 * Hash an API key for secure storage
 */
export function hashApiKey(key: string): string {
	return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Get the prefix of an API key for display (first 12 chars)
 */
export function getApiKeyPrefix(key: string): string {
	return key.substring(0, 12);
}

/**
 * Verify an API key and return the user ID if valid
 */
export async function verifyApiKey(key: string): Promise<string | null> {
	const hashedKey = hashApiKey(key);

	const apiKey = await db.apiKey.findUnique({
		where: { key: hashedKey },
		include: {
			user: true
		}
	});

	if (!apiKey) {
		return null;
	}

	// Check if expired
	if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
		return null;
	}

	// Update last used timestamp
	await db.apiKey.update({
		where: { id: apiKey.id },
		data: { lastUsedAt: new Date() }
	});

	return apiKey.userId;
}
