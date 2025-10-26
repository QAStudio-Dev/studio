import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Create a new test case
 * POST /api/projects/[projectId]/test-cases
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { projectId } = event.params;

	const {
		title,
		description,
		preconditions,
		steps,
		expectedResult,
		priority,
		type,
		automationStatus,
		tags,
		suiteId
	} = await event.request.json();

	if (!title || typeof title !== 'string') {
		throw error(400, {
			message: 'Test case title is required'
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

	// If suiteId is provided, verify it exists and belongs to this project
	if (suiteId) {
		const suite = await db.testSuite.findUnique({
			where: { id: suiteId }
		});

		if (!suite || suite.projectId !== projectId) {
			throw error(400, {
				message: 'Invalid test suite'
			});
		}
	}

	// Create the test case
	const testCase = await db.testCase.create({
		data: {
			title,
			description,
			preconditions,
			steps,
			expectedResult,
			priority: priority || 'MEDIUM',
			type: type || 'FUNCTIONAL',
			automationStatus: automationStatus || 'NOT_AUTOMATED',
			tags: tags || [],
			projectId,
			suiteId,
			createdBy: userId
		},
		include: {
			creator: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true
				}
			}
		}
	});

	return json({ testCase });
};
