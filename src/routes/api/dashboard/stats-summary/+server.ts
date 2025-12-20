import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * GET /api/dashboard/stats-summary
 * Get overall statistics (top stat cards)
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

	// Run all counts in parallel
	const [totalProjects, totalTestCases, totalTestRuns, passedTests, failedTests, blockedTests] =
		await Promise.all([
			db.project.count({
				where: user.teamId ? { teamId: user.teamId } : { createdBy: userId, teamId: null }
			}),
			db.testCase.count({
				where: user.teamId
					? { project: { teamId: user.teamId } }
					: { createdBy: userId, project: { teamId: null } }
			}),
			db.testRun.count({
				where: user.teamId
					? { project: { teamId: user.teamId } }
					: { createdBy: userId, project: { teamId: null } }
			}),
			db.testResult.count({
				where: {
					status: 'PASSED',
					...(user.teamId
						? { testRun: { project: { teamId: user.teamId } } }
						: { executedBy: userId, testRun: { project: { teamId: null } } })
				}
			}),
			db.testResult.count({
				where: {
					status: 'FAILED',
					...(user.teamId
						? { testRun: { project: { teamId: user.teamId } } }
						: { executedBy: userId, testRun: { project: { teamId: null } } })
				}
			}),
			db.testResult.count({
				where: {
					status: 'BLOCKED',
					...(user.teamId
						? { testRun: { project: { teamId: user.teamId } } }
						: { executedBy: userId, testRun: { project: { teamId: null } } })
				}
			})
		]);

	// Calculate pass rate excluding skipped tests (industry standard)
	const executedTests = passedTests + failedTests + blockedTests;
	const passRate = executedTests > 0 ? Math.round((passedTests / executedTests) * 100) : 0;

	return json({
		totalProjects,
		totalTestCases,
		totalTestRuns,
		passRate
	});
};
