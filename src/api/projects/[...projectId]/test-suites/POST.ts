import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { generateTestSuiteId } from '$lib/server/ids';
import { serializeDates } from '$lib/utils/date';
import { requireApiAuth } from '$lib/server/api-auth';
import { createAuditLog } from '$lib/server/audit';

export const Param = z.object({
	projectId: z.string()
});

export const Input = z.object({
	name: z.string().min(1).describe('Suite name'),
	description: z.string().optional().describe('Optional suite description'),
	parentId: z.string().nullable().optional().describe('Parent suite ID for nesting')
});

export const Output = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	parentId: z.string().nullable(),
	projectId: z.string(),
	order: z.number(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string()
});

export const Error = {
	400: error(400, 'Invalid request - check required fields'),
	401: error(401, 'Authentication required'),
	403: error(403, 'You do not have access to this project'),
	404: error(404, 'Project or parent suite not found'),
	500: error(500, 'Failed to create test suite')
};

export const Modifier = (r: any) => {
	r.tags = ['Suites'];
	r.summary = 'Create a test suite';
	r.description =
		'Create a new test suite for organizing test cases. Supports hierarchical nesting via parentId. Requires authentication and project access.';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<z.infer<typeof Output>> => {
		const userId = await requireApiAuth(evt);

		// Fetch project and user in parallel for better performance
		const [project, user] = await Promise.all([
			db.project.findUnique({
				where: { id: input.projectId }
			}),
			db.user.findUnique({
				where: { id: userId },
				select: { id: true, teamId: true }
			})
		]);

		if (!project) {
			throw Error[404];
		}

		if (!user) {
			throw Error[401];
		}

		/**
		 * Authorization Strategy:
		 * Verify the user has permission to create test suites in this project.
		 * Access is granted if the user is either:
		 * 1. The project creator, OR
		 * 2. A member of the same team as the project
		 */
		const hasAccess =
			project.createdBy === userId || (project.teamId && user.teamId === project.teamId);

		if (!hasAccess) {
			throw Error[403];
		}

		// If parentId is provided, verify it exists and belongs to this project
		if (input.parentId) {
			const parentSuite = await db.testSuite.findUnique({
				where: { id: input.parentId }
			});

			if (!parentSuite || parentSuite.projectId !== input.projectId) {
				throw error(400, 'Invalid parent suite - must belong to the same project');
			}
		}

		// Calculate the next order value for proper ordering
		// Get the max order for suites at the same level (same parentId)
		const maxOrderSuite = await db.testSuite.findFirst({
			where: {
				projectId: input.projectId,
				parentId: input.parentId ?? null
			},
			orderBy: { order: 'desc' }
		});

		const nextOrder = (maxOrderSuite?.order ?? -1) + 1;

		try {
			// Create the test suite
			const testSuite = await db.testSuite.create({
				data: {
					id: generateTestSuiteId(),
					name: input.name,
					description: input.description,
					projectId: input.projectId,
					parentId: input.parentId ?? null,
					order: nextOrder
				}
			});

			// Create audit log for tracking
			await createAuditLog({
				userId,
				teamId: project.teamId ?? undefined,
				action: 'TEST_SUITE_CREATED',
				resourceType: 'TestSuite',
				resourceId: testSuite.id,
				metadata: {
					testSuiteName: testSuite.name,
					projectId: input.projectId,
					parentId: input.parentId,
					order: nextOrder
				},
				event: evt
			});

			// serializeDates converts Date fields to ISO strings
			const serialized = serializeDates(testSuite);
			return Output.parse(serialized);
		} catch (err) {
			// Re-throw known API errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			// Handle specific Prisma errors
			if (err && typeof err === 'object' && 'code' in err) {
				if ((err as { code: string }).code === 'P2003') {
					throw Error[404];
				}
			}

			// Log unexpected errors
			console.error('Error creating test suite:', err);
			throw Error[500];
		}
	}
);
