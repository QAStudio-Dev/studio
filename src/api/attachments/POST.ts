import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { uploadToBlob, generateAttachmentPath } from '$lib/server/blob-storage';
import { requireApiAuth } from '$lib/server/api-auth';
import { MAX_UPLOAD_SIZE, MAX_UPLOAD_SIZE_MB } from '$lib/server/constants';

export const Input = z.object({
	name: z.string().min(1).max(255).describe('Attachment filename (max 255 characters)'),
	contentType: z.string().describe('MIME type of the file'),
	data: z.string().describe('Base64-encoded file data'),
	testCaseId: z.string().uuid().optional().describe('Test case ID to link attachment to'),
	testResultId: z.string().uuid().optional().describe('Test result ID to link attachment to'),
	type: z
		.enum(['screenshot', 'video', 'log', 'trace', 'other'])
		.optional()
		.describe('Attachment type (screenshot, video, log, trace, other)')
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
 * Sanitize filename to prevent path traversal attacks
 * Removes path separators and other potentially dangerous characters
 */
function sanitizeFilename(filename: string): string {
	// Replace path separators and dangerous characters with underscores
	// Keep only alphanumeric, dots, hyphens, and underscores
	return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * POST /api/attachments
 * Upload an attachment and link it to a test case or test result
 */
export default new Endpoint({ Input, Output, Modifier }).handle(
	async (input, event): Promise<any> => {
		const userId = await requireApiAuth(event);

		// Validate that either testCaseId or testResultId is provided
		if (!input.testCaseId && !input.testResultId) {
			throw error(400, 'Either testCaseId or testResultId is required');
		}

		// Validate MIME type before decoding base64 (performance optimization)
		if (!isValidMimeType(input.contentType)) {
			throw error(
				400,
				`Unsupported MIME type: ${input.contentType}. Allowed types: images (png, jpg, gif, webp, svg), videos (webm, mp4), archives (zip, gzip), text, logs, JSON`
			);
		}

		// Validate file size before decoding (prevent DoS attacks)
		const estimatedSize = (input.data.length * 3) / 4; // Base64 size estimate

		if (estimatedSize > MAX_UPLOAD_SIZE) {
			throw error(413, `File size exceeds maximum allowed size of ${MAX_UPLOAD_SIZE_MB}MB`);
		}

		// Decode base64 data
		let buffer: Buffer;
		try {
			buffer = Buffer.from(input.data, 'base64');
		} catch (err) {
			throw error(400, 'Invalid base64 data');
		}

		const fileSize = buffer.length;

		// Validate actual decoded size (handles padding/whitespace edge cases)
		if (fileSize > MAX_UPLOAD_SIZE) {
			throw error(413, `File size exceeds maximum allowed size of ${MAX_UPLOAD_SIZE_MB}MB`);
		}

		// Get user with team info for access control
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Verify access to test case or test result
		let testRunIdForPath: string | undefined;

		if (input.testCaseId) {
			const testCase = await db.testCase.findUnique({
				where: { id: input.testCaseId },
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

			// Check access to project
			const hasAccess =
				testCase.project.createdBy === userId ||
				(testCase.project.teamId && user?.teamId === testCase.project.teamId);

			if (!hasAccess) {
				throw error(403, 'You do not have access to this test case');
			}
		}

		if (input.testResultId) {
			const testResult = await db.testResult.findUnique({
				where: { id: input.testResultId },
				include: {
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
			});

			if (!testResult) {
				throw error(404, 'Test result not found');
			}

			// Check access to project
			const hasAccess =
				testResult.testRun.project.createdBy === userId ||
				(testResult.testRun.project.teamId && user?.teamId === testResult.testRun.project.teamId);

			if (!hasAccess) {
				throw error(403, 'You do not have access to this test result');
			}

			// Store testRunId for later use
			testRunIdForPath = testResult.testRunId;
		}

		// Generate filename and upload to storage
		// Sanitize filename to prevent path traversal attacks
		const sanitizedName = sanitizeFilename(input.name);
		const filename = testRunIdForPath
			? generateAttachmentPath(sanitizedName, testRunIdForPath, input.testResultId!)
			: `attachments/${input.testCaseId}/${Date.now()}-${sanitizedName}`;

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
