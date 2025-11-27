import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { hashPassword } from '$lib/server/crypto';
import {
	validatePasswordResetToken,
	markPasswordResetTokenAsUsed
} from '$lib/server/password-reset';
import { deleteAllUserSessions } from '$lib/server/sessions';

export const POST: RequestHandler = async (event) => {
	try {
		const { token, password } = await event.request.json();

		if (!token || !password) {
			throw error(400, {
				message: 'Token and password are required'
			});
		}

		// Validate password strength
		if (password.length < 8) {
			throw error(400, {
				message: 'Password must be at least 8 characters long'
			});
		}

		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
		if (!passwordRegex.test(password)) {
			throw error(400, {
				message:
					'Password must contain at least one uppercase letter, one lowercase letter, and one number'
			});
		}

		// Validate token
		const userId = await validatePasswordResetToken(token);

		if (!userId) {
			throw error(400, {
				message: 'Invalid or expired reset token'
			});
		}

		// Hash new password
		const passwordHash = await hashPassword(password);

		// Update user password
		await db.user.update({
			where: { id: userId },
			data: { passwordHash }
		});

		// Mark token as used
		await markPasswordResetTokenAsUsed(token);

		// Invalidate all existing sessions (force re-login)
		await deleteAllUserSessions(userId);

		return json({
			message: 'Password has been reset successfully'
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Reset password error:', err);
		throw error(500, {
			message: 'An error occurred'
		});
	}
};
