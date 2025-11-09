import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Move a test suite to a new parent (or make it root-level)
 * POST /api/suites/[suiteId]/move-to-parent
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { suiteId } = event.params;
	const { parentId } = await event.request.json();

	// Get the suite being moved
	const suite = await db.testSuite.findUnique({
		where: { id: suiteId },
		include: {
			project: true
		}
	});

	if (!suite) {
		throw error(404, { message: 'Suite not found' });
	}

	// Check permissions
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		suite.project.createdBy === userId ||
		(suite.project.teamId && user?.teamId === suite.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'Access denied' });
	}

	// If parentId is provided, verify it exists and belongs to the same project
	if (parentId) {
		const parentSuite = await db.testSuite.findUnique({
			where: { id: parentId }
		});

		if (!parentSuite) {
			throw error(404, { message: 'Parent suite not found' });
		}

		if (parentSuite.projectId !== suite.projectId) {
			throw error(400, { message: 'Parent suite must be in the same project' });
		}

		// Prevent circular references - check if parentId is a descendant of suiteId
		let current = parentSuite;
		while (current.parentId) {
			if (current.parentId === suiteId) {
				throw error(400, { message: 'Cannot move suite into its own descendant' });
			}
			const next = await db.testSuite.findUnique({
				where: { id: current.parentId }
			});
			if (!next) break;
			current = next;
		}
	}

	// Update the suite's parent
	const updatedSuite = await db.testSuite.update({
		where: { id: suiteId },
		data: {
			parentId: parentId || null
		}
	});

	return json({ suite: updatedSuite });
};
