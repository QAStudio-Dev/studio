import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';

export const Params = z.object({
	projectId: z.string().describe('Project ID')
});

export const Query = z.object({
	page: z.coerce.number().min(1).default(1).describe('Page number (default: 1)'),
	limit: z.coerce.number().min(1).max(100).default(20).describe('Results per page (default: 20)'),
	milestoneId: z.string().optional().describe('Filter by milestone ID'),
	environmentId: z.string().optional().describe('Filter by environment ID'),
	status: z
		.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'])
		.optional()
		.describe('Filter by status')
});

export const Output = z.object({
	data: z.array(
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
			milestone: z
				.object({
					id: z.string(),
					name: z.string()
				})
				.nullable()
				.describe('Associated milestone'),
			environment: z
				.object({
					id: z.string(),
					name: z.string()
				})
				.nullable()
				.describe('Associated environment'),
			_count: z
				.object({
					results: z.number()
				})
				.describe('Count of test results')
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
	r.tags = ['Projects'];
	r.summary = 'List test runs for a project';
	r.description =
		'Retrieve paginated test runs for a specific project with optional filtering by milestone, environment, and status.';
	return r;
};

/**
 * GET /api/projects/[projectId]/runs
 * List test runs for a project
 */
export default new Endpoint({ Params, Query, Output, Modifier }).handle(
	async ({ projectId }, query): Promise<any> => {
		const skip = (query.page - 1) * query.limit;

		const where: any = { projectId };
		if (query.milestoneId) where.milestoneId = query.milestoneId;
		if (query.environmentId) where.environmentId = query.environmentId;
		if (query.status) where.status = query.status;

		const [testRuns, total] = await Promise.all([
			db.testRun.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take: query.limit,
				include: {
					milestone: {
						select: {
							id: true,
							name: true
						}
					},
					environment: {
						select: {
							id: true,
							name: true
						}
					},
					_count: {
						select: {
							results: true
						}
					}
				}
			}),
			db.testRun.count({ where })
		]);

		return serializeDates({
			data: testRuns,
			pagination: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages: Math.ceil(total / query.limit),
				hasMore: skip + testRuns.length < total
			}
		});
	}
);
