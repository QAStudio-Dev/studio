import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';

export const Query = z.object({
	testCaseId: z.string().optional().describe('Filter by test case ID'),
	testResultId: z.string().optional().describe('Filter by test result ID')
});

export const Output = z.array(
	z.object({
		id: z.string().describe('Attachment ID'),
		filename: z.string().describe('Storage filename'),
		originalName: z.string().describe('Original filename'),
		mimeType: z.string().describe('MIME type'),
		size: z.number().describe('File size in bytes'),
		url: z.string().describe('Public URL to access the file'),
		testCaseId: z.string().nullable().describe('Linked test case ID'),
		testResultId: z.string().nullable().describe('Linked test result ID'),
		createdAt: z.coerce.string().describe('ISO 8601 creation timestamp')
	})
);

export const Modifier = (r: any) => {
	r.tags = ['Attachments'];
	r.summary = 'List attachments';
	r.description = 'Retrieve a list of attachments, optionally filtered by test case or test result';
	return r;
};

/**
 * GET /api/attachments
 * List attachments, optionally filtered by test case or test result
 */
export default new Endpoint({ Query, Output, Modifier }).handle(async (query): Promise<any> => {
	// Build filter based on query params
	const where: any = {};

	if (query.testCaseId) {
		where.testCaseId = query.testCaseId;
	}

	if (query.testResultId) {
		where.testResultId = query.testResultId;
	}

	const attachments = await db.attachment.findMany({
		where,
		orderBy: {
			createdAt: 'desc'
		}
	});

	return attachments;
});
