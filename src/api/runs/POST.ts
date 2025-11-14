import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';
import { deleteCache, CacheKeys } from '$lib/server/redis';
import { generateTestRunId, generateEnvironmentId } from '$lib/server/ids';

export const Input = z.object({
	projectId: z.string().describe('Project ID'),
	name: z.string().min(1).describe('Test run name'),
	description: z.string().optional().describe('Optional test run description'),
	environmentId: z.string().optional().describe('ID of existing environment'),
	environment: z
		.string()
		.optional()
		.describe('Name of environment (will be created if does not exist)'),
	milestoneId: z.string().optional().describe('ID of milestone')
});

export const Output = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED']),
	projectId: z.string(),
	environmentId: z.string().nullable(),
	milestoneId: z.string().nullable(),
	createdBy: z.string(),
	startedAt: z.coerce.string().nullable(),
	completedAt: z.coerce.string().nullable(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string(),
	project: z.object({
		id: z.string(),
		name: z.string(),
		key: z.string()
	}),
	environment: z
		.object({
			id: z.string(),
			name: z.string()
		})
		.nullable(),
	milestone: z
		.object({
			id: z.string(),
			name: z.string()
		})
		.nullable()
});

export const Error = {
	400: error(400, 'projectId and name are required'),
	403: error(403, 'You do not have access to this project'),
	404: error(404, 'Project not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Runs'];
	r.summary = 'Create a run';
	r.description =
		'Create a new test run. Supports both session and API key authentication. If environment name is provided instead of ID, the environment will be created automatically.';
	return r;
};

export default new Endpoint({ Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const userId = await requireApiAuth(evt);

		// Verify project access
		const project = await db.project.findUnique({
			where: { id: input.projectId },
			include: { team: true }
		});

		if (!project) {
			throw Error[404];
		}

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Check access: user must be creator or team member
		const hasAccess =
			project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

		if (!hasAccess) {
			throw Error[403];
		}

		// Handle environment - if environment string is provided, find or create it
		let resolvedEnvironmentId = input.environmentId;
		if (input.environment && !input.environmentId) {
			// Try to find existing environment by name for this project
			let env = await db.environment.findFirst({
				where: {
					name: input.environment,
					projectId: input.projectId
				}
			});

			// If doesn't exist, create it
			if (!env) {
				env = await db.environment.create({
					data: {
						id: generateEnvironmentId(),
						name: input.environment,
						projectId: input.projectId
					}
				});
			}

			resolvedEnvironmentId = env.id;
		}

		// Create the test run
		const testRun = await db.testRun.create({
			data: {
				id: generateTestRunId(),
				name: input.name,
				description: input.description,
				projectId: input.projectId,
				environmentId: resolvedEnvironmentId,
				milestoneId: input.milestoneId,
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

		// Invalidate project cache since it includes test run count
		await deleteCache(CacheKeys.project(input.projectId));

		return serializeDates(testRun);
	}
);
