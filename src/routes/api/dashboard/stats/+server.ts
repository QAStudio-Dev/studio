import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { loadDashboardData } from '$lib/server/dashboard';

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics and recent activity
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const dashboard = await loadDashboardData(userId);

	if (!dashboard) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json(dashboard);
};
