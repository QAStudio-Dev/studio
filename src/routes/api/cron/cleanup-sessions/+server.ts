import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanupExpiredSessions } from '$lib/server/sessions';
import { cleanupPasswordResetTokens } from '$lib/server/password-reset';

export const GET: RequestHandler = async (event) => {
	// Verify cron secret for security
	const authHeader = event.request.headers.get('authorization');
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw error(401, { message: 'Unauthorized' });
	}

	// Clean up expired sessions and password reset tokens
	await Promise.all([cleanupExpiredSessions(), cleanupPasswordResetTokens()]);

	return json({ success: true });
};
