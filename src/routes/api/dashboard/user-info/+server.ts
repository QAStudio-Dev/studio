import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * GET /api/dashboard/user-info
 * Get user and subscription info for dashboard
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true,
					members: true
				}
			}
		}
	});

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Calculate subscription info
	const hasActiveSubscription = user.team?.subscription?.status === ('ACTIVE' as any);
	const projectLimit = hasActiveSubscription ? null : 1;

	// Get project count to check if can create more
	const projectCount = await db.project.count({
		where: user.teamId ? { teamId: user.teamId } : { createdBy: userId, teamId: null }
	});

	const canCreateProject = projectLimit === null || projectCount < projectLimit;

	return json({
		user,
		subscription: {
			hasActiveSubscription,
			projectLimit,
			canCreateProject
		}
	});
};
