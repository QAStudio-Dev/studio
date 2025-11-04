import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { notifyTestRunCompleted, notifyTestRunFailed } from '$lib/server/integrations';

/**
 * POST /api/test-runs/[runId]/complete
 * Mark a test run as completed and send notifications
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireApiAuth(event);
	const { runId } = event.params;

	// Get test run with project and results
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
			},
			results: {
				select: {
					status: true
				}
			}
		}
	});

	if (!testRun) {
		throw error(404, { message: 'Test run not found' });
	}

	// Check access
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

	// Update test run status
	const updatedTestRun = await db.testRun.update({
		where: { id: runId },
		data: {
			status: 'COMPLETED',
			completedAt: new Date()
		}
	});

	// Calculate stats
	const passed = testRun.results.filter((r) => r.status === 'PASSED').length;
	const failed = testRun.results.filter((r) => r.status === 'FAILED').length;
	const total = testRun.results.length;
	const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

	// Send notifications if team exists
	if (testRun.project.teamId) {
		try {
			// Send test run failed notification if there are failures
			if (failed > 0) {
				await notifyTestRunFailed(testRun.project.teamId, {
					id: testRun.id,
					name: testRun.name,
					projectId: testRun.projectId,
					projectName: testRun.project.name,
					failedCount: failed
				});
			}

			// Always send test run completed notification
			await notifyTestRunCompleted(testRun.project.teamId, {
				id: testRun.id,
				name: testRun.name,
				projectId: testRun.projectId,
				projectName: testRun.project.name,
				passRate,
				total,
				passed,
				failed
			});
		} catch (notificationError) {
			console.error('Failed to send notifications:', notificationError);
			// Don't fail the request
		}
	}

	return json({
		...updatedTestRun,
		stats: {
			total,
			passed,
			failed,
			passRate
		}
	});
};
