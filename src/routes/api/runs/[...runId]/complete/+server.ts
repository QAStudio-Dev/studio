import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { notifyTestRunCompleted, notifyTestRunFailed } from '$lib/server/integrations';
import { deleteCache, CacheKeys } from '$lib/server/redis';

/**
 * POST /api/runs/[runId]/complete
 * Mark a test run as completed and send notifications in the background
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireApiAuth(event);
	const { runId } = event.params;

	const testRun = await db.testRun.findUnique({
		where: { id: runId },
		include: {
			project: {
				select: {
					id: true,
					name: true,
					teamId: true,
					createdBy: true
				}
			}
		}
	});

	if (!testRun) {
		throw error(404, { message: 'Test run not found' });
	}

	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	const hasAccess =
		testRun.project.createdBy === userId ||
		(testRun.project.teamId && user?.teamId === testRun.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this test run' });
	}

	const updatedTestRun = await db.testRun.update({
		where: { id: runId },
		data: {
			status: 'COMPLETED',
			completedAt: new Date()
		}
	});

	const statusCounts = await db.testResult.groupBy({
		by: ['status'],
		where: { testRunId: runId },
		_count: { status: true }
	});

	const countByStatus = Object.fromEntries(
		statusCounts.map((row) => [row.status, row._count.status])
	) as Record<string, number>;

	const passed = countByStatus.PASSED ?? 0;
	const failed = countByStatus.FAILED ?? 0;
	const skipped = countByStatus.SKIPPED ?? 0;
	const total = statusCounts.reduce((sum, row) => sum + row._count.status, 0);
	const executedTests = passed + failed;
	const passRate = executedTests > 0 ? Math.round((passed / executedTests) * 100) : 0;

	await deleteCache([
		CacheKeys.testRun(runId),
		CacheKeys.testResults(runId),
		CacheKeys.project(testRun.projectId)
	]);

	if (testRun.project.teamId) {
		const teamId = testRun.project.teamId;
		const notificationPayload = {
			id: testRun.id,
			name: testRun.name,
			projectId: testRun.projectId,
			projectName: testRun.project.name
		};

		void (async () => {
			try {
				if (failed > 0) {
					await notifyTestRunFailed(teamId, {
						...notificationPayload,
						failedCount: failed
					});
				}

				await notifyTestRunCompleted(teamId, {
					...notificationPayload,
					passRate,
					total,
					passed,
					failed,
					skipped
				});
			} catch (notificationError) {
				console.error('Failed to send notifications:', notificationError);
			}
		})();
	}

	return json({
		...updatedTestRun,
		stats: {
			total,
			passed,
			failed,
			skipped,
			passRate
		}
	});
};
