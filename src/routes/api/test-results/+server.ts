import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { uploadToBlob, generateAttachmentPath } from '$lib/server/blob-storage';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { sendNotification, notifyTestRunCompleted } from '$lib/server/integrations';
import type { SubmitTestResultsResponse } from '$lib/api/schemas';
import {
	generateTestCaseId,
	generateTestResultId,
	generateTestSuiteId,
	generateAttachmentId
} from '$lib/server/ids';

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
	const mimeToExt: Record<string, string> = {
		'image/png': 'png',
		'image/jpeg': 'jpg',
		'image/jpg': 'jpg',
		'image/gif': 'gif',
		'image/webp': 'webp',
		'video/webm': 'webm',
		'video/mp4': 'mp4',
		'video/quicktime': 'mov',
		'application/zip': 'zip',
		'application/json': 'json',
		'text/plain': 'txt',
		'text/markdown': 'md',
		'text/html': 'html',
		'text/css': 'css',
		'application/javascript': 'js'
	};
	return mimeToExt[mimeType.toLowerCase()] || 'bin';
}

/**
 * Helper function to process and upload attachments for a test result
 * @param attachments Array of attachments from the reporter
 * @param testRunId Test run ID
 * @param testResultId Test result ID
 * @returns Count of successfully uploaded attachments
 */
async function processAttachments(
	attachments: Array<{
		name: string;
		contentType: string;
		body?: string | Buffer;
		type?: string;
	}>,
	testRunId: string,
	testResultId: string
): Promise<number> {
	if (!attachments || attachments.length === 0) {
		return 0;
	}

	let uploadedCount = 0;

	for (const attachment of attachments) {
		try {
			// Convert body to Buffer
			let buffer: Buffer;

			if (!attachment.body) {
				console.warn(`Skipping attachment ${attachment.name}: no body provided`);
				continue;
			}

			if (typeof attachment.body === 'string') {
				// Could be base64 or a file path
				// Check if it looks like a file path
				if (attachment.body.includes('/') || attachment.body.includes('\\')) {
					// It's likely a file path - try to read it
					if (existsSync(attachment.body)) {
						buffer = await readFile(attachment.body);
					} else {
						console.warn(`File path doesn't exist for ${attachment.name}: ${attachment.body}`);
						// Fallback to base64 decode
						buffer = Buffer.from(attachment.body, 'base64');
					}
				} else {
					// Base64 encoded string
					buffer = Buffer.from(attachment.body, 'base64');
				}
			} else if (Buffer.isBuffer(attachment.body)) {
				// Already a Buffer
				buffer = attachment.body;
			} else if (
				typeof attachment.body === 'object' &&
				attachment.body.type === 'Buffer' &&
				Array.isArray(attachment.body.data)
			) {
				// Buffer serialized as JSON: { type: 'Buffer', data: [bytes...] }
				buffer = Buffer.from(attachment.body.data);
			} else {
				console.warn(
					`Skipping attachment ${attachment.name}: invalid body type`,
					typeof attachment.body
				);
				continue;
			}

			// Add proper extension to the filename if missing
			const extension = getExtensionFromMimeType(attachment.contentType);
			const nameWithExt = attachment.name.includes('.')
				? attachment.name
				: `${attachment.name}.${extension}`;

			// Generate unique filename
			const filename = generateAttachmentPath(nameWithExt, testRunId, testResultId);

			// Upload to blob storage
			const { downloadUrl } = await uploadToBlob(filename, buffer, {
				contentType: attachment.contentType
			});

			// Create attachment record
			await db.attachment.create({
				data: {
					id: generateAttachmentId(),
					filename,
					originalName: nameWithExt,
					mimeType: attachment.contentType,
					size: buffer.length,
					url: downloadUrl,
					testResultId
				}
			});

			uploadedCount++;
		} catch (err: any) {
			console.error(`Failed to upload attachment ${attachment.name}:`, err);
			// Continue processing other attachments even if one fails
		}
	}

	return uploadedCount;
}

/**
 * Helper function to find or create a nested test suite hierarchy
 * @param suitePath Array of suite names from root to leaf (e.g., ["Auth", "Login", "Success"])
 * @param projectId The project ID
 * @param userId The user ID creating the suites
 * @returns The ID of the leaf suite
 */
async function findOrCreateSuiteHierarchy(
	suitePath: string[],
	projectId: string,
	userId: string
): Promise<string | null> {
	if (suitePath.length === 0) return null;

	let parentId: string | null = null;

	for (const suiteName of suitePath) {
		// Try to find existing suite with this name and parent
		let suite = await db.testSuite.findFirst({
			where: {
				name: suiteName,
				projectId,
				parentId
			}
		});

		// If suite doesn't exist, create it
		if (!suite) {
			// Get the max order for suites at this level
			const maxOrderSuite = await db.testSuite.findFirst({
				where: {
					projectId,
					parentId
				},
				orderBy: { order: 'desc' }
			});

			suite = await db.testSuite.create({
				data: {
					id: generateTestSuiteId(),
					name: suiteName,
					projectId,
					parentId,
					order: (maxOrderSuite?.order ?? -1) + 1
				}
			});
		}

		parentId = suite.id;
	}

	return parentId;
}

/**
 * Submit test results (batch format from Playwright reporter)
 * POST /api/test-results
 *
 * Supports both session and API key authentication
 *
 * Expected format from Playwright reporter:
 * {
 *   testRunId: string,
 *   results: [{
 *     title: string,
 *     fullTitle?: string, // Full path like "Suite > Nested > Test"
 *     status: 'passed' | 'failed' | 'skipped',
 *     duration: number,
 *     errorMessage?: string,
 *     stackTrace?: string,
 *     attachments?: Array<any>
 *   }]
 * }
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireApiAuth(event);

	const body = await event.request.json();
	const { testRunId, results } = body;

	if (!testRunId || typeof testRunId !== 'string') {
		throw error(400, { message: 'testRunId is required' });
	}

	if (!results || !Array.isArray(results)) {
		throw error(400, { message: 'results array is required' });
	}

	// Verify test run access
	const testRun = await db.testRun.findUnique({
		where: { id: testRunId },
		include: {
			project: {
				include: {
					team: true,
					testCases: {
						select: {
							id: true,
							title: true,
							suiteId: true
						}
					}
				}
			}
		}
	});

	if (!testRun) {
		throw error(404, { message: 'Test run not found' });
	}

	// Get user with team info
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	// Check access
	const hasAccess =
		testRun.project.createdBy === userId ||
		(testRun.project.teamId && user?.teamId === testRun.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this test run' });
	}

	// Process results
	const processedResults = [];
	const errors = [];

	for (const result of results) {
		try {
			// Map Playwright status to QA Studio status
			let status: 'PASSED' | 'FAILED' | 'SKIPPED';
			switch (result.status?.toLowerCase()) {
				case 'passed':
					status = 'PASSED';
					break;
				case 'failed':
				case 'timedout':
					status = 'FAILED';
					break;
				case 'skipped':
				case 'interrupted':
					status = 'SKIPPED';
					break;
				default:
					status = 'SKIPPED';
			}

			// Parse the fullTitle to extract suite hierarchy
			// Example: "Auth > Login > Success > should login with valid credentials"
			// Suite path: ["Auth", "Login", "Success"]
			// Test title: "should login with valid credentials"
			let suiteId: string | null = null;
			let testTitle = result.title || 'Untitled Test';

			if (result.fullTitle) {
				const parts = result.fullTitle.split('>').map((s) => s.trim());
				if (parts.length > 1) {
					// Last part is the test title, everything else is suite hierarchy
					testTitle = parts[parts.length - 1];
					const suitePath = parts.slice(0, -1);

					// Create or find the suite hierarchy
					suiteId = await findOrCreateSuiteHierarchy(suitePath, testRun.projectId, userId);
				}
			}

			// Try to find matching test case by title and suite
			const testCase = testRun.project.testCases.find(
				(tc) => tc.title.toLowerCase() === testTitle.toLowerCase() && tc.suiteId === suiteId
			);

			if (!testCase) {
				// Create a new test case if it doesn't exist
				const newTestCase = await db.testCase.create({
					data: {
						id: generateTestCaseId(),
						title: testTitle,
						projectId: testRun.projectId,
						suiteId: suiteId,
						createdBy: userId,
						priority: 'MEDIUM',
						type: 'FUNCTIONAL',
						automationStatus: 'AUTOMATED'
					}
				});

				// Create test result
				const testResult = await db.testResult.create({
					data: {
						id: generateTestResultId(),
						testCaseId: newTestCase.id,
						testRunId,
						status,
						duration: result.duration || 0,
						errorMessage: result.errorMessage || result.error,
						stackTrace: result.stackTrace,
						executedBy: userId,
						executedAt: new Date()
					}
				});

				// Process attachments if any
				let attachmentCount = 0;
				if (result.attachments && Array.isArray(result.attachments)) {
					attachmentCount = await processAttachments(result.attachments, testRunId, testResult.id);
				}

				processedResults.push({
					testCaseId: newTestCase.id,
					testResultId: testResult.id,
					title: result.title,
					status,
					created: true,
					attachmentCount
				});
			} else {
				// Create test result for existing test case
				const testResult = await db.testResult.create({
					data: {
						id: generateTestResultId(),
						testCaseId: testCase.id,
						testRunId,
						status,
						duration: result.duration || 0,
						errorMessage: result.errorMessage || result.error,
						stackTrace: result.stackTrace,
						executedBy: userId,
						executedAt: new Date()
					}
				});

				// Process attachments if any
				let attachmentCount = 0;
				if (result.attachments && Array.isArray(result.attachments)) {
					attachmentCount = await processAttachments(result.attachments, testRunId, testResult.id);
				}

				processedResults.push({
					testCaseId: testCase.id,
					testResultId: testResult.id,
					title: result.title,
					status,
					created: false,
					attachmentCount
				});
			}
		} catch (err: any) {
			errors.push({
				testTitle: result.title,
				error: err.message || 'Unknown error'
			});
		}
	}

	// Send notifications after processing all results
	if (testRun.project.teamId) {
		try {
			// Calculate stats for the test run
			const allResults = await db.testResult.findMany({
				where: { testRunId },
				select: { status: true }
			});

			const passed = allResults.filter((r) => r.status === 'PASSED').length;
			const failed = allResults.filter((r) => r.status === 'FAILED').length;
			const total = allResults.length;
			const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

			// Check if we should send completion notification
			// Only send if this is likely the final batch (you might want to adjust this logic)
			const isComplete = testRun.status === 'COMPLETED';

			if (isComplete) {
				// Send test run completed notification
				await notifyTestRunCompleted(testRun.project.teamId, {
					id: testRun.id,
					name: testRun.name,
					projectName: testRun.project.name,
					passRate,
					total,
					passed,
					failed
				});
			}

			// Send individual test case failure notifications
			const baseUrl = process.env.PUBLIC_BASE_URL || 'https://qastudio.dev';
			const failedTests = processedResults.filter((r) => r.status === 'FAILED');
			for (const failedTest of failedTests) {
				await sendNotification(testRun.project.teamId, {
					event: 'TEST_CASE_FAILED',
					title: `❌ Test Case Failed: ${failedTest.title}`,
					message: `*Project:* ${testRun.project.name}\n*Test Run:* ${testRun.name}\n\n⚠️ This test needs attention`,
					url: `${baseUrl}/test-runs/${testRun.id}`,
					color: '#ff0000',
					fields: [{ name: '🧪 Test Case', value: failedTest.title, inline: false }]
				});
			}
		} catch (notificationError) {
			// Don't fail the request if notifications fail
			console.error('Failed to send notifications:', notificationError);
		}
	}

	const response: SubmitTestResultsResponse = {
		processedCount: processedResults.length,
		results: processedResults,
		errors: errors.length > 0 ? errors : undefined
	};
	return json(response);
};
