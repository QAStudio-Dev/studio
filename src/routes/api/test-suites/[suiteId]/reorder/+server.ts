import { json, error, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Update test suite order
 * POST /api/test-suites/[suiteId]/reorder
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const suiteId = event.params.suiteId;
	const { order } = await event.request.json();

	if (!suiteId) {
		throw error(400, { message: 'Suite ID is required' });
	}

	if (order === undefined) {
		throw error(400, { message: 'Order is required' });
	}

	// Get the test suite and verify access
	const suite = await db.testSuite.findUnique({
		where: { id: suiteId },
		include: {
			project: true
		}
	});

	if (!suite) {
		throw error(404, { message: 'Test suite not found' });
	}

	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		suite.project.createdBy === userId ||
		(suite.project.teamId && user?.teamId === suite.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'Access denied' });
	}

	try {
		const updated = await db.testSuite.update({
			where: { id: suiteId },
			data: { order }
		});

		return json({ suite: updated });
	} catch (err) {
		console.error('Failed to reorder suite:', err);
		throw error(500, { message: 'Failed to reorder suite' });
	}
};
