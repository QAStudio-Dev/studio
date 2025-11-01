import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * GET /api/dashboard/projects
 * Get user's projects for dashboard
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const projects = await db.project.findMany({
		where: user.teamId ? { teamId: user.teamId } : { createdBy: userId, teamId: null },
		include: {
			_count: {
				select: {
					testCases: true,
					testRuns: true
				}
			}
		},
		orderBy: {
			updatedAt: 'desc'
		}
	});

	return json({ projects });
};
