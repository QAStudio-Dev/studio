import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';

/**
 * Create a new test run
 * POST /api/test-runs
 *
 * Supports both session and API key authentication
 *
 * Request body:
 * - projectId: string (required)
 * - name: string (required)
 * - description: string (optional)
 * - environmentId: string (optional) - ID of existing environment
 * - environment: string (optional) - Name of environment (will be created if doesn't exist)
 * - milestoneId: string (optional)
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireApiAuth(event);

	const { projectId, name, description, environmentId, environment, milestoneId } =
		await event.request.json();

	if (!projectId || typeof projectId !== 'string') {
		throw error(400, { message: 'projectId is required' });
	}

	if (!name || typeof name !== 'string') {
		throw error(400, { message: 'Test run name is required' });
	}

	// Verify project access
	const project = await db.project.findUnique({
		where: { id: projectId },
		include: { team: true }
	});

	if (!project) {
		throw error(404, { message: 'Project not found' });
	}

	// Get user with team info
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	// Check access: user must be creator or team member
	const hasAccess =
		project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this project' });
	}

	// Handle environment - if environment string is provided, find or create it
	let resolvedEnvironmentId = environmentId;
	if (environment && typeof environment === 'string' && !environmentId) {
		// Try to find existing environment by name for this project
		let env = await db.environment.findFirst({
			where: {
				name: environment,
				projectId
			}
		});

		// If doesn't exist, create it
		if (!env) {
			env = await db.environment.create({
				data: {
					name: environment,
					projectId
				}
			});
		}

		resolvedEnvironmentId = env.id;
	}

	// Create the test run
	const testRun = await db.testRun.create({
		data: {
			name,
			description,
			projectId,
			environmentId: resolvedEnvironmentId,
			milestoneId,
			createdBy: userId,
			status: 'IN_PROGRESS',
			startedAt: new Date()
		},
		include: {
			project: {
				select: {
					id: true,
					name: true,
					key: true
				}
			},
			environment: true,
			milestone: true
		}
	});

	// Return in format expected by Playwright reporter (needs top-level id)
	return json({
		id: testRun.id,
		name: testRun.name,
		status: testRun.status,
		projectId: testRun.projectId,
		startedAt: testRun.startedAt,
		project: testRun.project,
		environment: testRun.environment,
		milestone: testRun.milestone
	});
};
