import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { hashPassword } from '$lib/server/crypto';
import { createSession, setSessionCookie, verifyCsrfToken } from '$lib/server/sessions';
import { TEMP_PASSWORD_HASH } from '$lib/server/auth-constants';
import { createAuditLog } from '$lib/server/audit';

/**
 * One-time password setup for users migrated from Clerk
 * This endpoint allows users with the temporary password to set their own password
 */
export const POST: RequestHandler = async (event) => {
	try {
		const { email, newPassword, csrfToken: submittedCsrfToken } = await event.request.json();

		// Validate CSRF token
		if (!submittedCsrfToken || !verifyCsrfToken(event, submittedCsrfToken)) {
			throw error(403, {
				message: 'Invalid CSRF token'
			});
		}

		if (!email || !newPassword) {
			throw error(400, {
				message: 'Email and new password are required'
			});
		}

		// Validate password strength
		if (newPassword.length < 8) {
			throw error(400, {
				message: 'Password must be at least 8 characters long'
			});
		}

		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
		if (!passwordRegex.test(newPassword)) {
			throw error(400, {
				message:
					'Password must contain at least one uppercase letter, one lowercase letter, and one number'
			});
		}

		// Find user
		const user = await db.user.findUnique({
			where: { email: email.trim().toLowerCase() }
		});

		if (!user) {
			throw error(401, {
				message: 'Invalid email'
			});
		}

		// Check if user still has the temporary password (from migration)
		if (user.passwordHash && user.passwordHash !== TEMP_PASSWORD_HASH) {
			throw error(400, {
				message: 'Password has already been set. Please use the login page.'
			});
		}

		// Hash new password
		const passwordHash = await hashPassword(newPassword);

		// Update user password
		const updatedUser = await db.user.update({
			where: { id: user.id },
			data: {
				passwordHash,
				emailVerified: true // Mark email as verified since they came from Clerk
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				teamId: true
			}
		});

		// Create session and log them in
		const { sessionId, token, csrfToken } = await createSession(user.id);
		setSessionCookie(event, sessionId, token, csrfToken);

		// Audit password setup
		await createAuditLog({
			userId: updatedUser.id,
			teamId: updatedUser.teamId ?? undefined,
			action: 'USER_PASSWORD_CHANGED',
			resourceType: 'User',
			resourceId: updatedUser.id,
			metadata: {
				email: updatedUser.email,
				method: 'setup'
			},
			event
		});

		return json({
			message: 'Password set successfully',
			user: {
				id: updatedUser.id,
				email: updatedUser.email,
				firstName: updatedUser.firstName,
				lastName: updatedUser.lastName,
				role: updatedUser.role
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Setup password error:', err);
		throw error(500, {
			message: 'An error occurred'
		});
	}
};
