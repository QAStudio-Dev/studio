import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '$lib/server/constants';

export const Query = z.object({
	testCaseId: z.string().optional().describe('Filter by test case ID'),
	testResultId: z.string().optional().describe('Filter by test result ID'),
	page: z.coerce.number().min(1).default(1).describe('Page number (default: 1)'),
	limit: z.coerce
		.number()
		.min(1)
		.max(MAX_PAGE_SIZE)
		.default(DEFAULT_PAGE_SIZE)
		.describe(`Results per page (default: ${DEFAULT_PAGE_SIZE})`)
});

export const Output = z.object({
	data: z.array(
		z.object({
			id: z.string().describe('Attachment ID'),
			filename: z.string().describe('Storage filename'),
			originalName: z.string().describe('Original filename'),
			mimeType: z.string().describe('MIME type'),
			size: z.number().describe('File size in bytes'),
			url: z.string().describe('Public URL to access the file'),
			testCaseId: z.string().nullable().describe('Linked test case ID'),
			testResultId: z.string().nullable().describe('Linked test result ID'),
			createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
			testCase: z
				.object({
					id: z.string(),
					title: z.string()
				})
				.nullable()
				.describe('Linked test case details'),
			testResult: z
				.object({
					id: z.string(),
					testRun: z.object({
						id: z.string(),
						name: z.string()
					})
				})
				.nullable()
				.describe('Linked test result details')
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
	r.tags = ['Attachments'];
	r.summary = 'List attachments';
	r.description =
		'Retrieve a paginated list of attachments with access control, optionally filtered by test case or test result';
	return r;
};

/**
 * GET /api/attachments
 * List attachments with proper authentication and access control
 */
export default new Endpoint({ Query, Output, Modifier }).handle(
	async (query, event): Promise<any> => {
		const userId = await requireApiAuth(event);
		const { page, limit, testCaseId, testResultId } = query;

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Build access control conditions more defensively
		const userTeamId = user?.teamId;
		const baseAccess = userTeamId
			? [{ createdBy: userId }, { teamId: userTeamId }]
			: [{ createdBy: userId }];

		// Build filter with access control
		// Only return attachments from projects the user has access to
		const where: any = {
			AND: [
				{
					OR: [
						{ testCase: { project: { OR: baseAccess } } },
						{ testResult: { testRun: { project: { OR: baseAccess } } } }
					]
				},
				// Ensure attachment is linked to either a test case or test result
				{
					OR: [{ testCaseId: { not: null } }, { testResultId: { not: null } }]
				}
			]
		};

		// Add optional filters
		if (testCaseId) {
			where.AND.push({ testCaseId });
		}

		if (testResultId) {
			where.AND.push({ testResultId });
		}

		const skip = (page - 1) * limit;

		// Fetch attachments with related data to avoid N+1 queries
		const [attachments, total] = await Promise.all([
			db.attachment.findMany({
				where,
				include: {
					testCase: {
						select: {
							id: true,
							title: true
						}
					},
					testResult: {
						select: {
							id: true,
							testRun: {
								select: {
									id: true,
									name: true
								}
							}
						}
					}
				},
				orderBy: {
					createdAt: 'desc'
				},
				skip,
				take: limit
			}),
			db.attachment.count({ where })
		]);

		return serializeDates({
			data: attachments,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
				hasMore: skip + attachments.length < total
			}
		});
	}
);
