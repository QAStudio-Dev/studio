import { db } from './db';
import { generateToken } from './crypto';
import crypto from 'crypto';

/**
 * Password reset token expiry (1 hour)
 */
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * HMAC secret for password reset tokens (use environment variable in production)
 */
const RESET_SECRET =
	process.env.RESET_SECRET ||
	process.env.SESSION_SECRET ||
	'dev-reset-secret-change-in-production';

/**
 * Create HMAC hash for reset token
 */
function hashResetToken(token: string): string {
	return crypto.createHmac('sha256', RESET_SECRET).update(token).digest('hex');
}

/**
 * Verify reset token against hash
 */
function verifyResetToken(token: string, hash: string): boolean {
	const computedHash = hashResetToken(token);
	return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

/**
 * Create a password reset token for a user
 *
 * @param userId - User ID to create reset token for
 * @returns Object containing token ID and the unhashed reset token (to be sent via email)
 */
export async function createPasswordResetToken(
	userId: string
): Promise<{ tokenId: string; token: string }> {
	// Generate token
	const token = generateToken(32);
	const hashedToken = hashResetToken(token);

	// Calculate expiry
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

	// Store token in database
	const resetToken = await db.passwordResetToken.create({
		data: {
			userId,
			token: hashedToken,
			expiresAt
		}
	});

	return { tokenId: resetToken.id, token };
}

/**
 * Validate a password reset token
 *
 * @param tokenId - Reset token ID from URL
 * @param token - Reset token to validate
 * @returns User ID if token is valid, null otherwise
 */
export async function validatePasswordResetToken(
	tokenId: string,
	token: string
): Promise<string | null> {
	// O(1) lookup by token ID
	const resetToken = await db.passwordResetToken.findUnique({
		where: {
			id: tokenId,
			used: false,
			expiresAt: {
				gt: new Date()
			}
		}
	});

	if (!resetToken) {
		return null;
	}

	// Verify token hash using constant-time comparison
	const isValid = verifyResetToken(token, resetToken.token);
	return isValid ? resetToken.userId : null;
}

/**
 * Mark a password reset token as used
 *
 * @param tokenId - Reset token ID to mark as used
 */
export async function markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
	// O(1) update by token ID
	await db.passwordResetToken
		.update({
			where: { id: tokenId },
			data: { used: true }
		})
		.catch(() => {
			// Ignore if token doesn't exist
		});
}

/**
 * Clean up expired or used password reset tokens
 */
export async function cleanupPasswordResetTokens(): Promise<void> {
	await db.passwordResetToken.deleteMany({
		where: {
			OR: [
				{
					expiresAt: {
						lt: new Date()
					}
				},
				{
					used: true
				}
			]
		}
	});
}
