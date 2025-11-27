import { db } from './db';
import { generateToken, hashToken, verifyToken } from './crypto';

/**
 * Password reset token expiry (1 hour)
 */
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Create a password reset token for a user
 *
 * @param userId - User ID to create reset token for
 * @returns The unhashed reset token (to be sent via email)
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
	// Generate token
	const token = generateToken(32);
	const hashedToken = await hashToken(token);

	// Calculate expiry
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

	// Store token in database
	await db.passwordResetToken.create({
		data: {
			userId,
			token: hashedToken,
			expiresAt
		}
	});

	return token;
}

/**
 * Validate a password reset token
 *
 * @param token - Reset token to validate
 * @returns User ID if token is valid, null otherwise
 */
export async function validatePasswordResetToken(token: string): Promise<string | null> {
	// Get all non-expired, unused tokens
	const tokens = await db.passwordResetToken.findMany({
		where: {
			used: false,
			expiresAt: {
				gt: new Date()
			}
		}
	});

	// Find matching token
	for (const resetToken of tokens) {
		const isValid = await verifyToken(token, resetToken.token);
		if (isValid) {
			return resetToken.userId;
		}
	}

	return null;
}

/**
 * Mark a password reset token as used
 *
 * @param token - Reset token to mark as used
 */
export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
	// Find the token
	const tokens = await db.passwordResetToken.findMany({
		where: {
			used: false
		}
	});

	// Find matching token and mark as used
	for (const resetToken of tokens) {
		const isValid = await verifyToken(token, resetToken.token);
		if (isValid) {
			await db.passwordResetToken.update({
				where: { id: resetToken.id },
				data: { used: true }
			});
			break;
		}
	}
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
