import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { sanitizeForMeta } from '$lib/utils/sanitize-meta';
import { hasProjectAccess } from '$lib/server/access-control';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	const { runId } = params;

	// Fetch test run with related data
	const testRun = await db.testRun.findUnique({
		where: { id: runId },
		include: {
			project: {
				select: {
					id: true,
					name: true,
					key: true,
					createdBy: true,
					teamId: true
				}
			},
			environment: {
				select: {
					id: true,
					name: true,
					description: true
				}
			},
			milestone: {
				select: {
					id: true,
					name: true,
					dueDate: true,
					status: true
				}
			},
			creator: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true
				}
			}
		}
	});

	if (!testRun) {
		throw error(404, { message: 'Test run not found' });
	}

	// Get user with team info
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			teamId: true
		}
	});

	if (!user) {
		throw error(401, { message: 'User not found' });
	}

	// Check access: user must be creator or team member
	if (!hasProjectAccess(testRun.project, user)) {
		throw error(403, { message: 'You do not have access to this test run' });
	}

	// Get statistics
	const stats = await db.testResult.groupBy({
		by: ['status'],
		where: { testRunId: runId },
		_count: true
	});

	const statusCounts = stats.reduce(
		(acc, stat) => {
			acc[stat.status] = stat._count;
			return acc;
		},
		{} as Record<string, number>
	);

	const totalResults = await db.testResult.count({
		where: { testRunId: runId }
	});

	return {
		testRun,
		stats: {
			total: totalResults,
			passed: statusCounts.PASSED || 0,
			failed: statusCounts.FAILED || 0,
			blocked: statusCounts.BLOCKED || 0,
			skipped: statusCounts.SKIPPED || 0,
			retest: statusCounts.RETEST || 0,
			untested: statusCounts.UNTESTED || 0
		},
		pageMetaTags: {
			title: `${sanitizeForMeta(testRun.name)} - Test Run`,
			description:
				sanitizeForMeta(testRun.description) ||
				`View detailed test results and execution history for the ${sanitizeForMeta(testRun.name)} test run in ${sanitizeForMeta(testRun.project.name)}. Analyze failures, track progress, and export reports.`
		}
	};
};
