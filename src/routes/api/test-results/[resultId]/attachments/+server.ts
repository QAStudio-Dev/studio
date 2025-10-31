import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { uploadToBlob, generateAttachmentPath } from '$lib/server/blob-storage';

/**
 * Upload attachment to a test result
 * POST /api/test-results/[resultId]/attachments
 *
 * Supports both session and API key authentication
 *
 * Request body:
 * {
 *   name: string,           // Filename (e.g., "screenshot.png")
 *   contentType: string,    // MIME type (e.g., "image/png")
 *   data: string,           // Base64 encoded file data
 *   type?: string           // Optional: "screenshot", "video", "trace", "other"
 * }
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireApiAuth(event);
	const { resultId } = event.params;

	const { name, contentType, data, type } = await event.request.json();

	if (!name || typeof name !== 'string') {
		throw error(400, { message: 'name is required' });
	}

	if (!contentType || typeof contentType !== 'string') {
		throw error(400, { message: 'contentType is required' });
	}

	if (!data || typeof data !== 'string') {
		throw error(400, { message: 'data is required (base64 encoded)' });
	}

	// Verify test result access
	const testResult = await db.testResult.findUnique({
		where: { id: resultId },
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
		throw error(404, { message: 'Test result not found' });
	}

	// Get user with team info
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	// Check access
	const hasAccess =
		testResult.testRun.project.createdBy === userId ||
		(testResult.testRun.project.teamId && user?.teamId === testResult.testRun.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this test result' });
	}

	try {
		// Decode base64 data
		const buffer = Buffer.from(data, 'base64');

		// Generate unique filename
		const filename = generateAttachmentPath(name, testResult.testRunId, resultId);

		// Upload to blob storage
		const { url, downloadUrl } = await uploadToBlob(filename, buffer, {
			contentType
		});

		// Create attachment record
		const attachment = await db.attachment.create({
			data: {
				filename,
				originalName: name,
				mimeType: contentType,
				size: buffer.length,
				url: downloadUrl,
				testResultId: resultId
			}
		});

		return json({
			attachment: {
				id: attachment.id,
				filename: attachment.filename,
				url: attachment.url,
				size: attachment.size,
				mimeType: attachment.mimeType
			}
		});
	} catch (err: any) {
		console.error('Failed to upload attachment:', err);
		throw error(500, { message: `Failed to upload attachment: ${err.message}` });
	}
};
