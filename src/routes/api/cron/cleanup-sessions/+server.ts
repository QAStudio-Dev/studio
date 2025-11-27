import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanupExpiredSessions } from '$lib/server/sessions';
import { cleanupPasswordResetTokens } from '$lib/server/password-reset';

/**
 * Cron job endpoint for cleaning up expired sessions and password reset tokens
 *
 * Security: Protected with CRON_SECRET to prevent unauthorized access
 * Schedule: Runs every 6 hours (configured in vercel.json)
 *
 * Test locally:
 * curl http://localhost:5173/api/cron/cleanup-sessions \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export const GET: RequestHandler = async (event) => {
	try {
		// Verify cron secret for security
		const authHeader = event.request.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		if (!cronSecret) {
			console.error('[Cron] CRON_SECRET not set - cleanup endpoint is disabled');
			throw error(503, {
				message: 'Cron endpoint not configured'
			});
		}

		if (authHeader !== `Bearer ${cronSecret}`) {
			console.error('[Cron] Invalid cron secret provided');
			throw error(401, { message: 'Unauthorized' });
		}

		console.log('[Cron] Starting cleanup job...');
		const startTime = Date.now();

		// Clean up expired sessions and password reset tokens in parallel
		await Promise.all([cleanupExpiredSessions(), cleanupPasswordResetTokens()]);

		const duration = Date.now() - startTime;
		console.log(`[Cron] Cleanup job completed in ${duration}ms`);

		return json({
			success: true,
			message: 'Cleanup completed successfully',
			duration
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Cron] Cleanup job failed:', err);
		throw error(500, {
			message: 'Cleanup job failed'
		});
	}
};
