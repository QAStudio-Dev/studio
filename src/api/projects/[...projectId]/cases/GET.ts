import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string().describe('Project ID')
});

export const Query = z.object({
	page: z.coerce.number().min(1).default(1).describe('Page number (default: 1)'),
	limit: z.coerce.number().min(1).max(100).default(50).describe('Results per page (default: 50)'),
	search: z.string().max(200).optional().describe('Search in test case title and description'),
	suiteId: z.string().optional().describe('Filter by test suite ID'),
	priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().describe('Filter by priority'),
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
		.describe('Filter by test type'),
	automationStatus: z
		.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE'])
		.optional()
		.describe('Filter by automation status'),
	tags: z.string().optional().describe('Filter by tags (comma-separated)')
});

export const Output = z.object({
	data: z.array(
		z.object({
			id: z.string().describe('Test case ID'),
			title: z.string().describe('Test case title'),
			description: z.string().nullable().describe('Test case description'),
			preconditions: z.string().nullable().describe('Setup requirements'),
			steps: z.any().nullable().describe('Array of test steps'),
			expectedResult: z.string().nullable().describe('Expected test result'),
			priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).describe('Test case priority'),
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
				.describe('Test case type'),
			automationStatus: z
				.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE'])
				.describe('Automation status'),
			tags: z.array(z.string()).describe('Test case tags'),
			projectId: z.string().describe('Project ID'),
			suiteId: z.string().nullable().describe('Test suite ID'),
			createdBy: z.string().describe('User ID who created the test case'),
			order: z.number().describe('Display order'),
			createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
			updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp'),
			suite: z
				.object({
					id: z.string(),
					name: z.string()
				})
				.nullable()
				.describe('Associated test suite'),
			_count: z
				.object({
					results: z.number(),
					attachments: z.number()
				})
				.describe('Count of related records')
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
	r.summary = 'List test cases for a project';
	r.description =
		'Retrieve paginated test cases for a specific project with optional filtering by suite, priority, type, automation status, and tags.';
	return r;
};

/**
 * GET /api/projects/[projectId]/cases
 * List test cases for a project with filtering
 */
export default new Endpoint({ Param, Query, Output, Modifier }).handle(
	async (input, event): Promise<any> => {
		const { projectId, page, limit, search, suiteId, priority, type, automationStatus, tags } =
			input;
		const userId = await requireApiAuth(event);

		// Verify project access
		const project = await db.project.findUnique({
			where: { id: projectId },
			include: { team: true }
		});

		if (!project) {
			throw error(404, 'Project not found');
		}

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Check access
		const hasAccess =
			project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

		if (!hasAccess) {
			throw error(403, 'You do not have access to this project');
		}

		const skip = (page - 1) * limit;

		const where: any = { projectId };

		// Filter by suite
		if (suiteId) {
			where.suiteId = suiteId;
		}

		// Search in title and description
		if (search) {
			where.OR = [
				{ title: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } }
			];
		}

		// Filter by priority
		if (priority) {
			where.priority = priority;
		}

		// Filter by type
		if (type) {
			where.type = type;
		}

		// Filter by automation status
		if (automationStatus) {
			where.automationStatus = automationStatus;
		}

		// Filter by tags
		if (tags) {
			const tagArray = tags.split(',').map((t) => t.trim());
			where.tags = { hasSome: tagArray };
		}

		const [testCases, total] = await Promise.all([
			db.testCase.findMany({
				where,
				orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
				skip,
				take: limit,
				include: {
					suite: {
						select: {
							id: true,
							name: true
						}
					},
					_count: {
						select: {
							results: true,
							attachments: true
						}
					}
				}
			}),
			db.testCase.count({ where })
		]);

		return serializeDates({
			data: testCases,
			pagination: {
				page: page,
				limit: limit,
				total,
				totalPages: Math.ceil(total / limit),
				hasMore: skip + testCases.length < total
			}
		});
	}
);
