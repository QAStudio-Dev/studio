import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

/**
 * Secret key for signing URLs
 * In production, this should be a strong random value from environment variables
 */
const SECRET_KEY = env.URL_SIGNING_SECRET || env.CLERK_SECRET_KEY || 'fallback-secret-key';

/**
 * Default expiration time for signed URLs (1 hour)
 */
const DEFAULT_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Generate a signed URL for an attachment
 * @param attachmentId - The attachment ID
 * @param expiresInMs - Expiration time in milliseconds (default: 1 hour)
 * @returns Signature that can be appended to URL as query parameter
 */
export function generateSignedUrl(
	attachmentId: string,
	expiresInMs: number = DEFAULT_EXPIRATION_MS
): { signature: string; expires: number } {
	const expires = Date.now() + expiresInMs;
	const message = `${attachmentId}:${expires}`;
	const signature = createHmac('sha256', SECRET_KEY).update(message).digest('hex');

	return { signature, expires };
}

/**
 * Verify a signed URL
 * @param attachmentId - The attachment ID
 * @param signature - The signature from the URL
 * @param expires - The expiration timestamp from the URL
 * @returns true if signature is valid and not expired
 */
export function verifySignedUrl(
	attachmentId: string,
	signature: string,
	expires: number
): { valid: boolean; error?: string } {
	// Check expiration
	if (Date.now() > expires) {
		return { valid: false, error: 'URL has expired' };
	}

	// Verify signature
	const message = `${attachmentId}:${expires}`;
	const expectedSignature = createHmac('sha256', SECRET_KEY).update(message).digest('hex');

	// Use timing-safe comparison to prevent timing attacks
	const signatureBuffer = Buffer.from(signature, 'hex');
	const expectedBuffer = Buffer.from(expectedSignature, 'hex');

	if (signatureBuffer.length !== expectedBuffer.length) {
		return { valid: false, error: 'Invalid signature' };
	}

	const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);

	if (!isValid) {
		return { valid: false, error: 'Invalid signature' };
	}

	return { valid: true };
}

/**
 * Generate a full signed URL for an attachment
 * @param attachmentId - The attachment ID
 * @param baseUrl - Base URL (e.g., "https://qastudio.dev")
 * @param expiresInMs - Expiration time in milliseconds (default: 1 hour)
 * @returns Full signed URL
 */
export function generateFullSignedUrl(
	attachmentId: string,
	baseUrl: string,
	expiresInMs: number = DEFAULT_EXPIRATION_MS
): string {
	const { signature, expires } = generateSignedUrl(attachmentId, expiresInMs);
	return `${baseUrl}/api/traces/${attachmentId}?signature=${signature}&expires=${expires}`;
}
