import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { createPasswordResetToken } from '$lib/server/password-reset';
import { verifyCsrfToken } from '$lib/server/sessions';
import { createAuditLog } from '$lib/server/audit';
import { sendPasswordResetEmail } from '$lib/server/email';
import { APP_CONFIG } from '$lib/config';

export const POST: RequestHandler = async (event) => {
	try {
		const { email, csrfToken: submittedCsrfToken } = await event.request.json();

		// Validate CSRF token
		if (!submittedCsrfToken || !verifyCsrfToken(event, submittedCsrfToken)) {
			throw error(403, {
				message: 'Invalid CSRF token'
			});
		}

		if (!email) {
			throw error(400, {
				message: 'Email is required'
			});
		}

		// Find user
		const user = await db.user.findUnique({
			where: { email: email.trim().toLowerCase() },
			select: { id: true, teamId: true, email: true }
		});

		// Always return success to prevent user enumeration
		if (user) {
			const { tokenId, token } = await createPasswordResetToken(user.id);

			// Audit password reset request
			await createAuditLog({
				userId: user.id,
				teamId: user.teamId ?? undefined,
				action: 'USER_PASSWORD_RESET_REQUESTED',
				resourceType: 'User',
				resourceId: user.id,
				metadata: {
					email: user.email
				},
				event
			});

			// Build reset URL
			const baseUrl = process.env.PUBLIC_APP_URL || APP_CONFIG.DEFAULT_URL;
			const resetUrl = `${baseUrl}/reset-password?token=${tokenId}:${token}`;

			// Send password reset email (async, don't wait)
			sendPasswordResetEmail({
				to: user.email,
				resetUrl,
				expiresInMinutes: 60
			}).catch((error) => {
				console.error('Failed to send password reset email:', error);
				// Don't fail the request if email fails
			});

			// Development-only: Also log reset link to console for convenience
			if (process.env.NODE_ENV !== 'production') {
				console.log(`\n📧 Password reset link for ${email}:`);
				console.log(`   ${resetUrl}`);
				console.log(`   ⏰ Expires in 1 hour\n`);
			}
		}

		return json({
			message: 'If an account exists with this email, a password reset link has been sent.'
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Request reset error:', err);
		throw error(500, {
			message: 'An error occurred'
		});
	}
};
