import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { generateTestCaseId } from '$lib/server/ids';
import { serializeDates } from '$lib/utils/date';
import { createAuditLog } from '$lib/server/audit';

export const Param = z.object({
	projectId: z.string()
});

export const Input = z.object({
	title: z.string().min(1).describe('Test case title'),
	description: z.string().optional().describe('Detailed test case description'),
	preconditions: z.string().optional().describe('Pre-requisites before executing the test'),
	steps: z.string().optional().describe('Test execution steps'),
	expectedResult: z.string().optional().describe('Expected test outcome'),
	priority: z
		.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
		.optional()
		.describe('Test case priority'),
	type: z
		.enum([
			'FUNCTIONAL',
			'REGRESSION',
			'SMOKE',
			'INTEGRATION',
			'PERFORMANCE',
			'SECURITY',
			'UI',
			'API',
			'UNIT',
			'E2E'
		])
		.optional()
		.describe('Test type'),
	automationStatus: z
		.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE'])
		.optional()
		.describe('Automation status'),
	tags: z.array(z.string()).optional().describe('Tags for categorization'),
	suiteId: z.string().optional().describe('Parent test suite ID')
});

export const Output = z.object({
	testCase: z.object({
		id: z.string(),
		title: z.string(),
		description: z.string().nullable(),
		preconditions: z.string().nullable(),
		steps: z.any().nullable(), // Json type from Prisma - array of test steps
		expectedResult: z.string().nullable(),
		priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
		type: z.enum([
			'FUNCTIONAL',
			'REGRESSION',
			'SMOKE',
			'INTEGRATION',
			'PERFORMANCE',
			'SECURITY',
			'UI',
			'API',
			'UNIT',
			'E2E'
		]),
		automationStatus: z.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE']),
		tags: z.array(z.string()),
		projectId: z.string(),
		suiteId: z.string().nullable(),
		createdBy: z.string(),
		createdAt: z.coerce.string(),
		updatedAt: z.coerce.string(),
		creator: z.object({
			id: z.string(),
			email: z.string(),
			firstName: z.string().nullable(),
			lastName: z.string().nullable()
		})
	})
});

export const Error = {
	400: error(400, 'Invalid test suite'),
	401: error(401, 'User not found'),
	403: error(403, 'You do not have access to this project'),
	404: error(404, 'Project not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Cases'];
	r.summary = 'Create a test case';
	r.description =
		'Create a new test case with steps, expected results, and metadata. Optionally assign to a test suite.';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<z.infer<typeof Output>> => {
		try {
			const userId = await requireApiAuth(evt);

			// Fetch project and user in parallel for better performance
			const [project, user] = await Promise.all([
				db.project.findUnique({
					where: { id: input.projectId }
				}),
				db.user.findUnique({
					where: { id: userId }
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
			 * We use explicit access checks rather than relying solely on foreign key constraints
			 * because test case creation requires both:
			 * 1. Verifying the user has permission to create cases in this project (owner or team member)
			 * 2. Ensuring the user record exists for audit logging and creator relation
			 *
			 * This dual check provides better error messages (403 vs generic DB error) and
			 * prevents orphaned records if a user is deleted while their session is still valid.
			 */
			const hasAccess =
				project.createdBy === userId || (project.teamId && user.teamId === project.teamId);

			if (!hasAccess) {
				throw Error[403];
			}

			// If suiteId is provided, verify it exists and belongs to this project
			if (input.suiteId) {
				const suite = await db.testSuite.findUnique({
					where: { id: input.suiteId }
				});

				if (!suite || suite.projectId !== input.projectId) {
					throw Error[400];
				}
			}

			// Calculate the next order value for proper ordering
			const maxOrder = await db.testCase.aggregate({
				where: {
					projectId: input.projectId,
					suiteId: input.suiteId ?? null
				},
				_max: {
					order: true
				}
			});
			const nextOrder = (maxOrder._max.order ?? -1) + 1;

			// Create the test case
			const testCase = await db.testCase.create({
				data: {
					id: generateTestCaseId(),
					title: input.title,
					description: input.description,
					preconditions: input.preconditions,
					steps: input.steps,
					expectedResult: input.expectedResult,
					priority: input.priority || 'MEDIUM',
					type: input.type || 'FUNCTIONAL',
					automationStatus: input.automationStatus || 'NOT_AUTOMATED',
					tags: input.tags || [],
					projectId: input.projectId,
					suiteId: input.suiteId,
					createdBy: userId,
					order: nextOrder
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

			// Create audit log for tracking
			await createAuditLog({
				userId,
				teamId: project.teamId ?? undefined,
				action: 'TEST_CASE_CREATED',
				resourceType: 'TestCase',
				resourceId: testCase.id,
				metadata: {
					testCaseTitle: testCase.title,
					projectId: input.projectId,
					suiteId: input.suiteId,
					priority: testCase.priority,
					type: testCase.type,
					automationStatus: testCase.automationStatus
				},
				event: evt
			});

			return { testCase: serializeDates(testCase) } as unknown as z.infer<typeof Output>;
		} catch (err) {
			// Re-throw known API errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			// Log unexpected errors and throw generic error
			console.error('Error creating test case:', err);
			throw error(500, 'Failed to create test case');
		}
	}
);
