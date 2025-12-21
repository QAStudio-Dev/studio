import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	runId: z.string().describe('Test run ID')
});

export const Query = z.object({
	page: z.coerce.number().min(1).default(1).describe('Page number (default: 1)'),
	limit: z.coerce
		.number()
		.min(1)
		.max(1000)
		.default(50)
		.describe('Results per page (default: 50, max: 1000)'),
	search: z.string().optional().describe('Search in test case title'),
	status: z
		.enum(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST', 'UNTESTED'])
		.optional()
		.describe('Filter by result status'),
	priority: z
		.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
		.optional()
		.describe('Filter by test case priority'),
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
		.describe('Filter by test case type')
});

export const Output = z.object({
	testResults: z.array(
		z.object({
			id: z.string().describe('Test result ID'),
			testCaseId: z.string().describe('Test case ID'),
			testRunId: z.string().describe('Test run ID'),
			status: z
				.enum(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST', 'UNTESTED'])
				.describe('Result status'),
			fullTitle: z.string().nullable().describe('Full hierarchical test title'),
			comment: z.string().nullable().describe('Result comment'),
			duration: z.number().nullable().describe('Test duration in milliseconds'),
			stackTrace: z.string().nullable().describe('Stack trace for failures'),
			errorMessage: z.string().nullable().describe('Error message'),
			errorSnippet: z.string().nullable().describe('Error code snippet'),
			errorLocation: z.any().nullable().describe('Error location in code'),
			retry: z.number().describe('Retry attempt number'),
			projectName: z.string().nullable().describe('Project/browser name'),
			metadata: z.any().nullable().describe('Additional metadata'),
			consoleOutput: z.any().nullable().describe('Console output'),
			executedBy: z.string().describe('User ID who executed the test'),
			executedAt: z.coerce.string().describe('ISO 8601 execution timestamp'),
			createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
			updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp'),
			testCase: z
				.object({
					id: z.string(),
					title: z.string(),
					description: z.string().nullable(),
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
					suitePath: z
						.array(
							z.object({
								id: z.string(),
								name: z.string()
							})
						)
						.describe('Hierarchical suite path')
				})
				.describe('Associated test case'),
			executor: z
				.object({
					id: z.string(),
					firstName: z.string().nullable(),
					lastName: z.string().nullable(),
					email: z.string()
				})
				.optional()
				.describe('User who executed the test'),
			attachments: z
				.array(
					z.object({
						id: z.string(),
						filename: z.string(),
						originalName: z.string(),
						mimeType: z.string(),
						url: z.string(),
						size: z.number(),
						createdAt: z.coerce.string()
					})
				)
				.describe('Test result attachments'),
			steps: z
				.array(
					z.object({
						id: z.string(),
						stepNumber: z.number(),
						title: z.string(),
						category: z.string().nullable(),
						status: z.enum([
							'PASSED',
							'FAILED',
							'BLOCKED',
							'SKIPPED',
							'RETEST',
							'UNTESTED'
						]),
						duration: z.number().nullable(),
						error: z.string().nullable(),
						stackTrace: z.string().nullable(),
						location: z.any().nullable()
					})
				)
				.optional()
				.describe('Test step results'),
			_count: z
				.object({
					attachments: z.number(),
					steps: z.number()
				})
				.describe('Count of related records')
		})
	),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		totalPages: z.number()
	})
});

export const Modifier = (r: any) => {
	r.tags = ['Runs'];
	r.summary = 'Get test results for a run';
	r.description =
		'Retrieve paginated test results for a specific test run with search and filtering capabilities. Returns results with nested test case details and suite hierarchy.';
	return r;
};

/**
 * GET /api/runs/[runId]/results
 * Get test results for a specific test run with pagination, search, and filters
 */
export default new Endpoint({ Param, Query, Output, Modifier }).handle(
	async (input, event): Promise<any> => {
		const { runId, page, limit, search, status, priority, type } = input;
		const userId = await requireApiAuth(event);

		const skip = (page - 1) * limit;

		// Verify test run access
		const testRun = await db.testRun.findUnique({
			where: { id: runId },
			include: {
				project: {
					include: {
						team: true
					}
				}
			}
		});

		if (!testRun) {
			throw error(404, 'Test run not found');
		}

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Check access
		const hasAccess =
			testRun.project.createdBy === userId ||
			(testRun.project.teamId && user?.teamId === testRun.project.teamId);

		if (!hasAccess) {
			throw error(403, 'You do not have access to this test run');
		}

		// Build where clause for test results
		const where: any = {
			testRunId: runId
		};

		// Filter by status
		if (status) {
			where.status = status;
		}

		// Build where clause for test case filtering
		const testCaseWhere: any = {};

		// Search in test case title
		if (search) {
			testCaseWhere.title = { contains: search, mode: 'insensitive' };
		}

		// Filter by priority
		if (priority) {
			testCaseWhere.priority = priority;
		}

		// Filter by type
		if (type) {
			testCaseWhere.type = type;
		}

		// If there are test case filters, add them to the where clause
		if (Object.keys(testCaseWhere).length > 0) {
			where.testCase = testCaseWhere;
		}

		// Get total count
		const total = await db.testResult.count({ where });

		// Get test results with nested suite hierarchy
		const testResults = await db.testResult.findMany({
			where,
			skip,
			take: limit,
			orderBy: { executedAt: 'desc' },
			include: {
				testCase: {
					include: {
						suite: {
							include: {
								parent: {
									include: {
										parent: {
											include: {
												parent: {
													include: {
														parent: true
													}
												}
											}
										}
									}
								}
							}
						}
					}
				},
				executor: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true
					}
				},
				attachments: {
					select: {
						id: true,
						filename: true,
						originalName: true,
						mimeType: true,
						url: true,
						size: true,
						createdAt: true
					},
					orderBy: {
						createdAt: 'asc'
					}
				},
				steps: {
					select: {
						id: true,
						stepNumber: true,
						title: true,
						category: true,
						status: true,
						duration: true,
						error: true,
						stackTrace: true,
						location: true
					},
					orderBy: {
						stepNumber: 'asc'
					}
				},
				_count: {
					select: {
						attachments: true,
						steps: true
					}
				}
			}
		});

		// Build suite path for each result (traverse parent chain)
		const resultsWithSuitePath = testResults.map((result) => {
			const suitePath: { id: string; name: string }[] = [];

			if (result.testCase.suite) {
				let currentSuite: any = result.testCase.suite;
				while (currentSuite) {
					suitePath.unshift({ id: currentSuite.id, name: currentSuite.name });
					currentSuite = currentSuite.parent;
				}
			}

			return {
				...result,
				testCase: {
					...result.testCase,
					suitePath
				}
			};
		});

		return serializeDates({
			testResults: resultsWithSuitePath,
			pagination: {
				page: page,
				limit: limit,
				total,
				totalPages: Math.ceil(total / limit)
			}
		});
	}
);
