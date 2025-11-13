import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { uploadToBlob, generateAttachmentPath } from '$lib/server/blob-storage';
import { requireAuth } from '$lib/server/auth';

export const Input = z.object({
	name: z.string().describe('Attachment filename'),
	contentType: z.string().describe('MIME type of the file'),
	data: z.string().describe('Base64-encoded file data'),
	testCaseId: z.string().optional().describe('Test case ID to link attachment to'),
	testResultId: z.string().optional().describe('Test result ID to link attachment to'),
	type: z.string().optional().describe('Attachment type (screenshot, video, log, etc.)')
});

export const Output = z.object({
	attachment: z.object({
		id: z.string().describe('Attachment ID'),
		filename: z.string().describe('Storage filename'),
		url: z.string().describe('Public URL'),
		size: z.number().describe('File size in bytes'),
		mimeType: z.string().describe('MIME type')
	})
});

export const Modifier = (r: any) => {
	r.tags = ['Attachments'];
	r.summary = 'Upload attachment';
	r.description =
		'Upload an attachment (screenshot, log, video) and link it to a test case or test result. Accepts base64-encoded data.';
	return r;
};

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
	// Images
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	// Videos
	'video/webm',
	'video/mp4',
	// Archives (for Playwright traces)
	'application/zip',
	'application/gzip',
	'application/x-gzip',
	// Text/Logs
	'text/plain',
	'text/html',
	'text/css',
	'text/javascript',
	'application/json',
	'application/xml'
];

function isValidMimeType(mimeType: string): boolean {
	return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * POST /api/attachments
 * Upload an attachment and link it to a test case or test result
 */
export default new Endpoint({ Input, Output, Modifier }).handle(
	async (input, event): Promise<any> => {
		const userId = requireAuth(event);

		// Validate that either testCaseId or testResultId is provided
		if (!input.testCaseId && !input.testResultId) {
			throw new Error('Either testCaseId or testResultId is required');
		}

		// Validate MIME type
		if (!isValidMimeType(input.contentType)) {
			throw new Error(
				`Unsupported MIME type: ${input.contentType}. Allowed types: images (png, jpg, gif, webp, svg), videos (webm, mp4), archives (zip, gzip), text, logs, JSON`
			);
		}

		// Decode base64 data
		let buffer: Buffer;
		try {
			buffer = Buffer.from(input.data, 'base64');
		} catch (err) {
			throw new Error('Invalid base64 data');
		}

		const fileSize = buffer.length;

		// Verify access to test case or test result
		if (input.testCaseId) {
			const testCase = await db.testCase.findUnique({
				where: { id: input.testCaseId },
				include: { project: true }
			});

			if (!testCase) {
				throw new Error('Test case not found');
			}

			// TODO: Add project access check when RBAC is implemented
		}

		if (input.testResultId) {
			const testResult = await db.testResult.findUnique({
				where: { id: input.testResultId },
				include: { testRun: { include: { project: true } } }
			});

			if (!testResult) {
				throw new Error('Test result not found');
			}

			// TODO: Add project access check when RBAC is implemented
		}

		// Generate filename and upload to storage
		const testRunId = input.testResultId || input.testCaseId || 'unknown';
		const filename = generateAttachmentPath(input.name, testRunId, input.testResultId);

		const { url } = await uploadToBlob(filename, buffer, {
			contentType: input.contentType,
			access: 'public'
		});

		// Create attachment record in database
		const attachment = await db.attachment.create({
			data: {
				filename,
				originalName: input.name,
				mimeType: input.contentType,
				size: fileSize,
				url,
				testCaseId: input.testCaseId || null,
				testResultId: input.testResultId || null
			}
		});

		return {
			attachment: {
				id: attachment.id,
				filename: attachment.filename,
				url: attachment.url,
				size: attachment.size,
				mimeType: attachment.mimeType
			}
		};
	}
);
