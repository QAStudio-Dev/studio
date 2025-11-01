import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Create a new test suite
 * POST /api/projects/[projectId]/suites
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { projectId } = event.params;

	const { name, description, parentId } = await event.request.json();

	if (!name || typeof name !== 'string') {
		throw error(400, {
			message: 'Suite name is required'
		});
	}

	// Verify project exists and user has access
	const project = await db.project.findUnique({
		where: { id: projectId }
	});

	if (!project) {
		throw error(404, {
			message: 'Project not found'
		});
	}

	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

	if (!hasAccess) {
		throw error(403, {
			message: 'You do not have access to this project'
		});
	}

	// If parentId is provided, verify it exists and belongs to this project
	if (parentId) {
		const parentSuite = await db.testSuite.findUnique({
			where: { id: parentId }
		});

		if (!parentSuite || parentSuite.projectId !== projectId) {
			throw error(400, {
				message: 'Invalid parent suite'
			});
		}
	}

	// Create the test suite
	const suite = await db.testSuite.create({
		data: {
			name,
			description,
			projectId,
			parentId
		}
	});

	return json({ suite });
};
