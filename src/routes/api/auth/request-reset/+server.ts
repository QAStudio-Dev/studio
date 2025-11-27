import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { createPasswordResetToken } from '$lib/server/password-reset';

export const POST: RequestHandler = async (event) => {
	try {
		const { email } = await event.request.json();

		if (!email) {
			throw error(400, {
				message: 'Email is required'
			});
		}

		// Find user
		const user = await db.user.findUnique({
			where: { email: email.toLowerCase() }
		});

		// Always return success to prevent user enumeration
		// In production, you would send an email with the reset link
		if (user) {
			const { tokenId, token } = await createPasswordResetToken(user.id);

			// TODO: Send email with reset link
			// For now, log to console (REMOVE IN PRODUCTION!)
			const resetUrl = `http://localhost:5173/reset-password?token=${tokenId}:${token}`;
			console.log(`Password reset link for ${email}:`);
			console.log(resetUrl);
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
