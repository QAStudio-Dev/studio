import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';

/**
 * Mark a test run as completed
 * POST /api/test-runs/[runId]/complete
 *
 * Supports both session and API key authentication
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireApiAuth(event);
	const { runId } = event.params;

	// Verify test run access
	const testRun = await db.testRun.findUnique({
		where: { id: runId },
		include: {
			project: {
				include: {
					team: true
				}
			}
		}
	});

	if (!testRun) {
		throw error(404, { message: 'Test run not found' });
	}

	// Get user with team info
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	// Check access
	const hasAccess =
		testRun.project.createdBy === userId ||
		(testRun.project.teamId && user?.teamId === testRun.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this test run' });
	}

	// Update the test run
	const updatedTestRun = await db.testRun.update({
		where: { id: runId },
		data: {
			status: 'COMPLETED',
			completedAt: new Date()
		},
		include: {
			project: {
				select: {
					id: true,
					name: true,
					key: true
				}
			},
			_count: {
				select: {
					results: true
				}
			}
		}
	});

	return json({ testRun: updatedTestRun });
};
