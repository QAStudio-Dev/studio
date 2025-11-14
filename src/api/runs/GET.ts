import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Query = z.object({
	page: z.coerce.number().min(1).default(1).describe('Page number (default: 1)'),
	limit: z.coerce
		.number()
		.min(1)
		.max(100)
		.default(20)
		.describe('Results per page (default: 20, max: 100)'),
	search: z.string().optional().describe('Search in test run name and description'),
	projectId: z.string().optional().describe('Filter by project ID'),
	status: z
		.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'])
		.optional()
		.describe('Filter by status'),
	environmentId: z.string().optional().describe('Filter by environment ID'),
	milestoneId: z.string().optional().describe('Filter by milestone ID')
});

export const Output = z.object({
	testRuns: z.array(
		z.object({
			id: z.string().describe('Test run ID'),
			name: z.string().describe('Test run name'),
			description: z.string().nullable().describe('Test run description'),
			projectId: z.string().describe('Project ID'),
			milestoneId: z.string().nullable().describe('Milestone ID'),
			environmentId: z.string().nullable().describe('Environment ID'),
			status: z
				.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'])
				.describe('Test run status'),
			createdBy: z.string().describe('User ID who created the run'),
			startedAt: z.coerce.string().nullable().describe('ISO 8601 start timestamp'),
			completedAt: z.coerce.string().nullable().describe('ISO 8601 completion timestamp'),
			createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
			updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp'),
			project: z
				.object({
					id: z.string(),
					name: z.string(),
					key: z.string()
				})
				.describe('Associated project'),
			environment: z
				.object({
					id: z.string(),
					name: z.string()
				})
				.nullable()
				.describe('Associated environment'),
			milestone: z
				.object({
					id: z.string(),
					name: z.string()
				})
				.nullable()
				.describe('Associated milestone'),
			creator: z
				.object({
					id: z.string(),
					firstName: z.string().nullable(),
					lastName: z.string().nullable(),
					email: z.string()
				})
				.optional()
				.describe('User who created the run'),
			stats: z
				.object({
					total: z.number().describe('Total test results'),
					passed: z.number().describe('Passed tests'),
					failed: z.number().describe('Failed tests'),
					blocked: z.number().describe('Blocked tests'),
					skipped: z.number().describe('Skipped tests'),
					retest: z.number().describe('Tests requiring retest'),
					untested: z.number().describe('Untested cases')
				})
				.describe('Test result statistics')
		})
	),
	pagination: z.object({
		page: z.number().describe('Current page'),
		limit: z.number().describe('Results per page'),
		total: z.number().describe('Total test runs'),
		totalPages: z.number().describe('Total pages')
	})
});

export const Modifier = (r: any) => {
	r.tags = ['Runs'];
	r.summary = 'List test runs';
	r.description =
		'Retrieve a paginated list of test runs with filters and search. Returns test runs the authenticated user has access to (from their projects or team projects).';
	return r;
};

/**
 * GET /api/runs
 * List test runs with pagination, search, and filters
 */
export default new Endpoint({ Query, Output, Modifier }).handle(
	async (query, event): Promise<any> => {
		const userId = await requireApiAuth(event);

		const skip = (query.page - 1) * query.limit;

		// Build where clause
		const where: any = {};

		// Search in name and description
		if (query.search) {
			where.OR = [
				{ name: { contains: query.search, mode: 'insensitive' } },
				{ description: { contains: query.search, mode: 'insensitive' } }
			];
		}

		// Filter by status
		if (query.status) {
			where.status = query.status;
		}

		// Filter by environment
		if (query.environmentId) {
			where.environmentId = query.environmentId;
		}

		// Filter by milestone
		if (query.milestoneId) {
			where.milestoneId = query.milestoneId;
		}

		// Only show test runs from projects the user has access to
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Find all projects user has access to
		const accessibleProjects = await db.project.findMany({
			where: {
				OR: [{ createdBy: userId }, ...(user?.teamId ? [{ teamId: user.teamId }] : [])]
			},
			select: { id: true }
		});

		const accessibleProjectIds = accessibleProjects.map((p) => p.id);

		// Add project access filter
		where.projectId = query.projectId || { in: accessibleProjectIds };

		// Get total count
		const total = await db.testRun.count({ where });

		// Get test runs
		const testRuns = await db.testRun.findMany({
			where,
			skip,
			take: query.limit,
			orderBy: { createdAt: 'desc' },
			include: {
				project: {
					select: {
						id: true,
						name: true,
						key: true
					}
				},
				environment: {
					select: {
						id: true,
						name: true
					}
				},
				milestone: {
					select: {
						id: true,
						name: true
					}
				},
				creator: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true
					}
				},
				_count: {
					select: {
						results: true
					}
				}
			}
		});

		// Calculate statistics for each test run
		const testRunsWithStats = await Promise.all(
			testRuns.map(async (testRun) => {
				const stats = await db.testResult.groupBy({
					by: ['status'],
					where: { testRunId: testRun.id },
					_count: true
				});

				const statusCounts = stats.reduce(
					(acc, stat) => {
						acc[stat.status] = stat._count;
						return acc;
					},
					{} as Record<string, number>
				);

				return {
					...testRun,
					stats: {
						total: testRun._count.results,
						passed: statusCounts.PASSED || 0,
						failed: statusCounts.FAILED || 0,
						blocked: statusCounts.BLOCKED || 0,
						skipped: statusCounts.SKIPPED || 0,
						retest: statusCounts.RETEST || 0,
						untested: statusCounts.UNTESTED || 0
					}
				};
			})
		);

		return serializeDates({
			testRuns: testRunsWithStats,
			pagination: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages: Math.ceil(total / query.limit)
			}
		});
	}
);
