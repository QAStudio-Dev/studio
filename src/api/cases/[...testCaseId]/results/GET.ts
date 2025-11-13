import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	testCaseId: z.string().describe('Test case ID')
});

export const Query = z.object({
	page: z.coerce.number().min(1).default(1).describe('Page number (default: 1)'),
	limit: z.coerce.number().min(1).max(100).default(10).describe('Results per page (default: 10)')
});

export const Output = z.object({
	data: z.array(
		z.object({
			id: z.string().describe('Test result ID'),
			testCaseId: z.string().describe('Test case ID'),
			testRunId: z.string().describe('Test run ID'),
			status: z
				.enum(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST', 'UNTESTED'])
				.describe('Result status'),
			fullTitle: z.string().nullable().describe('Full hierarchical test title'),
			duration: z.number().nullable().describe('Test duration in milliseconds'),
			errorMessage: z.string().nullable().describe('Error message'),
			stackTrace: z.string().nullable().describe('Stack trace'),
			executedBy: z.string().describe('User ID who executed the test'),
			executedAt: z.coerce.string().describe('ISO 8601 execution timestamp'),
			createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
			executor: z
				.object({
					firstName: z.string().nullable(),
					lastName: z.string().nullable(),
					email: z.string()
				})
				.optional()
				.describe('User who executed the test'),
			testRun: z
				.object({
					id: z.string(),
					name: z.string()
				})
				.describe('Associated test run'),
			attachments: z
				.array(
					z.object({
						id: z.string(),
						filename: z.string(),
						originalName: z.string(),
						mimeType: z.string(),
						size: z.number(),
						url: z.string(),
						createdAt: z.coerce.string()
					})
				)
				.describe('Test attachments'),
			steps: z.array(z.any()).describe('Test execution steps (hierarchical)')
		})
	),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		totalPages: z.number(),
		hasMore: z.boolean()
	})
});

export const Modifier = (r: any) => {
	r.tags = ['Cases'];
	r.summary = 'Get results for a test case';
	r.description =
		'Retrieve paginated test results for a specific test case, including execution history, attachments, and steps.';
	return r;
};

/**
 * GET /api/cases/[testCaseId]/results
 * Get paginated results for a test case
 */
export default new Endpoint({ Param, Query, Output, Modifier }).handle(
	async (input, event): Promise<any> => {
		const { testCaseId, page, limit } = input;
		const userId = await requireApiAuth(event);

		// Verify test case access
		const testCase = await db.testCase.findUnique({
			where: { id: testCaseId },
			include: {
				project: {
					include: {
						team: true
					}
				}
			}
		});

		if (!testCase) {
			throw error(404, 'Test case not found');
		}

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Check access to project
		const hasAccess =
			testCase.project.createdBy === userId ||
			(testCase.project.teamId && user?.teamId === testCase.project.teamId);

		if (!hasAccess) {
			throw error(403, 'You do not have access to this test case');
		}

		const skip = (page - 1) * limit;

		const [results, total] = await Promise.all([
			db.testResult.findMany({
				where: { testCaseId },
				orderBy: { executedAt: 'desc' },
				skip,
				take: limit,
				include: {
					executor: {
						select: {
							firstName: true,
							lastName: true,
							email: true
						}
					},
					testRun: {
						select: {
							id: true,
							name: true
						}
					},
					attachments: {
						select: {
							id: true,
							filename: true,
							originalName: true,
							mimeType: true,
							size: true,
							url: true,
							createdAt: true
						},
						orderBy: {
							createdAt: 'asc'
						}
					},
					steps: {
						where: { parentStepId: null }, // Only get top-level steps
						orderBy: { stepNumber: 'asc' },
						include: {
							childSteps: {
								orderBy: { stepNumber: 'asc' },
								include: {
									childSteps: {
										orderBy: { stepNumber: 'asc' }
									}
								}
							}
						}
					}
				}
			}),
			db.testResult.count({ where: { testCaseId } })
		]);

		return serializeDates({
			data: results,
			pagination: {
				page: page,
				limit: limit,
				total,
				totalPages: Math.ceil(total / limit),
				hasMore: skip + results.length < total
			}
		});
	}
);
