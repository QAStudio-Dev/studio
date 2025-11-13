import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { serializeDates } from '$lib/utils/date';

export const Params = z.object({
	id: z.string().describe('Attachment ID')
});

export const Query = z.object({
	metadata: z
		.enum(['true', 'false'])
		.optional()
		.describe('If true, returns JSON metadata instead of redirecting to file')
});

export const Output = z.object({
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
			title: z.string(),
			project: z.object({
				id: z.string(),
				name: z.string(),
				key: z.string(),
				createdBy: z.string(),
				teamId: z.string().nullable(),
				team: z
					.object({
						id: z.string(),
						name: z.string()
					})
					.nullable()
			})
		})
		.nullable()
		.describe('Associated test case'),
	testResult: z
		.object({
			id: z.string(),
			testCase: z.object({
				title: z.string()
			}),
			testRun: z.object({
				id: z.string(),
				name: z.string(),
				project: z.object({
					id: z.string(),
					name: z.string(),
					key: z.string(),
					createdBy: z.string(),
					teamId: z.string().nullable(),
					team: z
						.object({
							id: z.string(),
							name: z.string()
						})
						.nullable()
				})
			})
		})
		.nullable()
		.describe('Associated test result')
});

export const Modifier = (r: any) => {
	r.tags = ['Attachments'];
	r.summary = 'Get attachment details or download';
	r.description =
		'Retrieve attachment metadata or redirect to the attachment file. Use ?metadata=true to get JSON metadata only.';
	return r;
};

/**
 * GET /api/attachments/[id]
 * Get attachment metadata or download attachment
 */
export default new Endpoint({ Params, Query, Output, Modifier }).handle(
	async ({ id }, query, event): Promise<any> => {
		const userId = await requireAuth(event);
		const metadata = query.metadata === 'true';

		const attachment = await db.attachment.findUnique({
			where: { id },
			include: {
				testCase: {
					select: {
						id: true,
						title: true,
						project: {
							include: {
								team: true
							}
						}
					}
				},
				testResult: {
					select: {
						id: true,
						testCase: {
							select: {
								title: true
							}
						},
						testRun: {
							include: {
								project: {
									include: {
										team: true
									}
								}
							}
						}
					}
				}
			}
		});

		if (!attachment) {
			throw error(404, { message: 'Attachment not found' });
		}

		// Check access control
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		const project = attachment.testResult?.testRun.project || attachment.testCase?.project;

		if (!project) {
			throw error(404, { message: 'Associated project not found' });
		}

		const hasAccess =
			project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

		if (!hasAccess) {
			throw error(403, { message: 'You do not have access to this attachment' });
		}

		// If metadata only, return JSON
		if (metadata) {
			return serializeDates(attachment);
		}

		// For file download/view:
		// If it's a Vercel Blob URL (production), redirect to it
		if (attachment.url.startsWith('https://')) {
			return new Response(null, {
				status: 302,
				headers: {
					Location: attachment.url,
					'Cache-Control': 'public, max-age=31536000'
				}
			});
		}

		// For local development mock URLs, return a placeholder
		return new Response('Attachment preview not available in local development mode', {
			status: 200,
			headers: {
				'Content-Type': 'text/plain'
			}
		});
	}
);
