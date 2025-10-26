import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Update test case order and/or suite
 * POST /api/test-cases/[testCaseId]/reorder
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { testCaseId } = event.params;

	const { suiteId, order } = await event.request.json();

	// Get the test case and verify access
	const testCase = await db.testCase.findUnique({
		where: { id: testCaseId },
		include: {
			project: true
		}
	});

	if (!testCase) {
		throw error(404, { message: 'Test case not found' });
	}

	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		testCase.createdBy === userId ||
		(testCase.project.teamId && user?.teamId === testCase.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'Access denied' });
	}

	// Update the test case
	const updated = await db.testCase.update({
		where: { id: testCaseId },
		data: {
			...(suiteId !== undefined && { suiteId }),
			...(order !== undefined && { order })
		}
	});

	return json({ testCase: updated });
};
