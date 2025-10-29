import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * GET /api/dashboard/recent-results
 * Get recent test results for dashboard
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

	const recentResults = await db.testResult.findMany({
		where: user.teamId
			? { testRun: { project: { teamId: user.teamId } } }
			: { executedBy: userId, testRun: { project: { teamId: null } } },
		include: {
			testCase: {
				select: { title: true }
			},
			testRun: {
				select: {
					name: true,
					project: {
						select: { name: true, key: true }
					}
				}
			}
		},
		orderBy: {
			executedAt: 'desc'
		},
		take: 10
	});

	return json({ recentResults });
};
