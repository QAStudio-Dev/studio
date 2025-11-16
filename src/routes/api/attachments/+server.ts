import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { uploadToBlob, generateAttachmentPath } from '$lib/server/blob-storage';

/**
 * Upload attachment
 * POST /api/attachments
 *
 * Supports both session and API key authentication
 *
 * Accepts two formats:
 *
 * 1. JSON with base64 (application/json):
 * {
 *   name: string,           // Filename (e.g., "screenshot.png")
 *   contentType: string,    // MIME type (e.g., "image/png")
 *   data: string,           // Base64 encoded file data
 *   testCaseId?: string,    // Optional: Link to test case
 *   testResultId?: string,  // Optional: Link to test result
 *   type?: string           // Optional: "screenshot", "video", "trace", "other"
 * }
 *
 * 2. Multipart form data (multipart/form-data):
 *   - file: File (required)
 *   - testCaseId: string (optional)
 *   - testResultId: string (optional)
 *   - type: string (optional)
 *
 * Note: Must provide either testCaseId or testResultId
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireApiAuth(event);

	const contentType = event.request.headers.get('content-type') || '';
	let name: string;
	let mimeType: string;
	let buffer: Buffer;
	let type: string | undefined;
	let testCaseId: string | null = null;
	let testResultId: string | null = null;

	// Handle multipart/form-data
	if (contentType.includes('multipart/form-data')) {
		const formData = await event.request.formData();
		const file = formData.get('file') as File;
		testCaseId = (formData.get('testCaseId') as string) || null;
		testResultId = (formData.get('testResultId') as string) || null;
		type = (formData.get('type') as string) || undefined;

		if (!file) {
			throw error(400, { message: 'file is required in form data' });
		}

		name = file.name;
		mimeType = file.type;
		const arrayBuffer = await file.arrayBuffer();
		buffer = Buffer.from(arrayBuffer);
	}
	// Handle JSON with base64
	else {
		const body = await event.request.json();
		const { name: jsonName, contentType: jsonContentType, data } = body;
		testCaseId = body.testCaseId || null;
		testResultId = body.testResultId || null;
		type = body.type;

		if (!jsonName || typeof jsonName !== 'string') {
			throw error(400, { message: 'name is required' });
		}

		if (!jsonContentType || typeof jsonContentType !== 'string') {
			throw error(400, { message: 'contentType is required' });
		}

		if (!data || typeof data !== 'string') {
			throw error(400, { message: 'data is required (base64 encoded)' });
		}

		name = jsonName;
		mimeType = jsonContentType;
		buffer = Buffer.from(data, 'base64');
	}

	// Validate that at least one ID is provided
	if (!testCaseId && !testResultId) {
		throw error(400, { message: 'Either testCaseId or testResultId is required' });
	}

	// Verify access to test case or test result
	if (testResultId) {
		const testResult = await db.testResult.findUnique({
			where: { id: testResultId },
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
			(testResult.testRun.project.teamId &&
				user?.teamId === testResult.testRun.project.teamId);

		if (!hasAccess) {
			throw error(403, { message: 'You do not have access to this test result' });
		}
	}

	if (testCaseId) {
		const testCase = await db.testCase.findUnique({
			where: { id: testCaseId },
			include: {
				suite: {
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

		if (!testCase || !testCase.suite) {
			throw error(404, { message: 'Test case not found' });
		}

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Check access
		const hasAccess =
			testCase.suite.project.createdBy === userId ||
			(testCase.suite.project.teamId && user?.teamId === testCase.suite.project.teamId);

		if (!hasAccess) {
			throw error(403, { message: 'You do not have access to this test case' });
		}
	}

	try {
		// Generate unique filename
		// For test results, use testRunId if available; otherwise use a generic path
		let filename: string;
		if (testResultId) {
			const testResult = await db.testResult.findUnique({
				where: { id: testResultId },
				select: { testRunId: true }
			});
			filename = generateAttachmentPath(name, testResult!.testRunId, testResultId);
		} else {
			// For test cases, generate a simpler path
			filename = `attachments/${testCaseId}/${Date.now()}-${name}`;
		}

		// Upload to blob storage
		const { url, downloadUrl } = await uploadToBlob(filename, buffer, {
			contentType: mimeType
		});

		// Create attachment record
		const attachment = await db.attachment.create({
			data: {
				filename,
				originalName: name,
				mimeType,
				size: buffer.length,
				url: downloadUrl,
				testCaseId,
				testResultId
			}
		});

		return json(
			{
				attachment: {
					id: attachment.id,
					filename: attachment.filename,
					url: attachment.url,
					size: attachment.size,
					mimeType: attachment.mimeType
				}
			},
			{ status: 201 }
		);
	} catch (err: any) {
		console.error('Failed to upload attachment:', err);
		throw error(500, { message: `Failed to upload attachment: ${err.message}` });
	}
};

/**
 * List attachments
 * GET /api/attachments?testCaseId=xxx&testResultId=xxx
 *
 * Supports both session and API key authentication
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireApiAuth(event);

	const testCaseId = event.url.searchParams.get('testCaseId');
	const testResultId = event.url.searchParams.get('testResultId');

	const where: any = {};
	if (testCaseId) where.testCaseId = testCaseId;
	if (testResultId) where.testResultId = testResultId;

	// Verify access if filtering by testCaseId or testResultId
	if (testResultId) {
		const testResult = await db.testResult.findUnique({
			where: { id: testResultId },
			include: {
				testRun: {
					include: {
						project: {
							select: {
								createdBy: true,
								teamId: true
							}
						}
					}
				}
			}
		});

		if (!testResult) {
			throw error(404, { message: 'Test result not found' });
		}

		const user = await db.user.findUnique({
			where: { id: userId }
		});

		const hasAccess =
			testResult.testRun.project.createdBy === userId ||
			(testResult.testRun.project.teamId &&
				user?.teamId === testResult.testRun.project.teamId);

		if (!hasAccess) {
			throw error(403, { message: 'You do not have access to this test result' });
		}
	}

	if (testCaseId) {
		const testCase = await db.testCase.findUnique({
			where: { id: testCaseId },
			include: {
				suite: {
					include: {
						project: {
							select: {
								createdBy: true,
								teamId: true
							}
						}
					}
				}
			}
		});

		if (!testCase || !testCase.suite) {
			throw error(404, { message: 'Test case not found' });
		}

		const user = await db.user.findUnique({
			where: { id: userId }
		});

		const hasAccess =
			testCase.suite.project.createdBy === userId ||
			(testCase.suite.project.teamId && user?.teamId === testCase.suite.project.teamId);

		if (!hasAccess) {
			throw error(403, { message: 'You do not have access to this test case' });
		}
	}

	const attachments = await db.attachment.findMany({
		where,
		orderBy: { createdAt: 'desc' }
	});

	return json(attachments);
};
