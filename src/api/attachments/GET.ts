import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Query = z.object({
	testCaseId: z.string().optional().describe('Filter by test case ID'),
	testResultId: z.string().optional().describe('Filter by test result ID'),
	page: z.coerce.number().min(1).default(1).describe('Page number (default: 1)'),
	limit: z.coerce.number().min(1).max(100).default(50).describe('Results per page (default: 50)')
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

		// Build filter with access control
		// Only return attachments from projects the user has access to
		const where: any = {
			OR: [
				{
					testCase: {
						project: {
							OR: [{ createdBy: userId }, { teamId: user?.teamId ?? 'none' }]
						}
					}
				},
				{
					testResult: {
						testRun: {
							project: {
								OR: [{ createdBy: userId }, { teamId: user?.teamId ?? 'none' }]
							}
						}
					}
				}
			]
		};

		// Add optional filters
		if (testCaseId) {
			where.testCaseId = testCaseId;
		}

		if (testResultId) {
			where.testResultId = testResultId;
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
