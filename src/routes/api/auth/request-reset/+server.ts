import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { createPasswordResetToken } from '$lib/server/password-reset';
import { verifyCsrfToken } from '$lib/server/sessions';
import { createAuditLog } from '$lib/server/audit';

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
		// In production, you would send an email with the reset link
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

			// TODO: Implement email sending using Resend API
			// Email template should include:
			// - Reset link with tokenId and token
			// - Expiry notice (1 hour)
			// - Security warning to ignore if not requested

			// Development-only: Log reset link to console
			if (process.env.NODE_ENV !== 'production') {
				const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
				const resetUrl = `${baseUrl}/reset-password?token=${tokenId}:${token}`;
				console.log(`\n📧 Password reset link for ${email}:`);
				console.log(`   ${resetUrl}`);
				console.log(`   ⏰ Expires in 1 hour\n`);
			} else {
				// Production: Email integration required
				console.warn(
					`[SECURITY] Password reset requested for ${email} but email is not configured. ` +
						`User will not receive reset link. Configure Resend API to enable password reset emails.`
				);
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
