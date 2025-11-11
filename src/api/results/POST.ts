import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { uploadToBlob, generateAttachmentPath } from '$lib/server/blob-storage';
import { sendNotification, notifyTestRunCompleted } from '$lib/server/integrations';
import {
	generateTestCaseId,
	generateTestResultId,
	generateTestSuiteId,
	generateAttachmentId
} from '$lib/server/ids';
import { deleteCache, CacheKeys } from '$lib/server/redis';

export const Input = z.object({
	testRunId: z.string().describe('ID of the test run'),
	results: z
		.array(
			z.object({
				title: z.string().describe('Test case title'),
				fullTitle: z.string().optional().describe('Full hierarchical title (e.g., "Suite > Test")'),
				status: z
					.enum(['passed', 'failed', 'skipped', 'timedout', 'interrupted'])
					.describe('Test execution status'),
				duration: z.number().optional().describe('Test duration in milliseconds'),
				errorMessage: z.string().optional().describe('Error message if test failed'),
				error: z.string().optional().describe('Alternative error field'),
				stackTrace: z.string().optional().describe('Stack trace for failures'),
				attachments: z
					.array(
						z.object({
							name: z.string(),
							contentType: z.string(),
							body: z.union([z.string(), z.any()]).optional(),
							type: z.string().optional()
						})
					)
					.optional()
					.describe('Screenshots, logs, videos, etc.')
			})
		)
		.describe('Array of test results to submit')
});

export const Output = z.object({
	processedCount: z.number().describe('Number of results successfully processed'),
	results: z.array(
		z.object({
			testCaseId: z.string(),
			testResultId: z.string(),
			title: z.string(),
			status: z.enum(['PASSED', 'FAILED', 'SKIPPED']),
			duration: z.number().nullable().describe('Test duration in milliseconds'),
			created: z.boolean().describe('Whether a new test case was created'),
			attachmentCount: z.number()
		})
	),
	errors: z
		.array(
			z.object({
				testTitle: z.string(),
				error: z.string()
			})
		)
		.optional()
		.describe('Errors encountered during processing'),
	attachmentErrors: z
		.array(
			z.object({
				testTitle: z.string(),
				attachmentName: z.string(),
				error: z.string()
			})
		)
		.optional()
		.describe('Attachment upload errors')
});

export const Error = {
	400: error(400, 'testRunId and results array are required'),
	403: error(403, 'You do not have access to this test run'),
	404: error(404, 'Test run not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Results'];
	r.summary = 'Submit test results';
	r.description =
		'Submit batch test results from test runners (e.g., Playwright). Automatically creates test cases and suites if they do not exist. Supports attachments (screenshots, logs, videos).';
	return r;
};

/**
 * Allowed MIME types for attachments
 *
 * Supports common Playwright attachments:
 * - Screenshots: image/png, image/jpeg
 * - Videos: video/webm, video/mp4
 * - Traces: application/zip, application/octet-stream
 * - Logs: text/plain, application/x-ndjson
 * - Network HAR: application/json
 */
const ALLOWED_MIME_TYPES = [
	// Images
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	// Videos
	'video/webm',
	'video/mp4',
	'video/quicktime',
	// Archives (includes Playwright traces)
	'application/zip',
	'application/x-zip-compressed',
	'application/gzip',
	'application/x-gzip',
	// Binary data (for buffers without explicit MIME type)
	'application/octet-stream',
	// Text
	'text/plain',
	'text/markdown',
	'text/html',
	'text/css',
	'application/json',
	'application/javascript',
	'application/xml',
	// Logs
	'application/x-ndjson',
	'text/x-log'
] as const;

/**
 * Validate MIME type
 */
function isValidMimeType(mimeType: string): boolean {
	return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

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
		'image/svg+xml': 'svg',
		'video/webm': 'webm',
		'video/mp4': 'mp4',
		'video/quicktime': 'mov',
		'application/zip': 'zip',
		'application/x-zip-compressed': 'zip',
		'application/gzip': 'gz',
		'application/json': 'json',
		'text/plain': 'txt',
		'text/markdown': 'md',
		'text/html': 'html',
		'text/css': 'css',
		'application/javascript': 'js',
		'application/xml': 'xml',
		'application/x-ndjson': 'ndjson'
	};
	return mimeToExt[mimeType.toLowerCase()] || 'bin';
}

/**
 * Helper function to process and upload attachments for a test result
 */
async function processAttachments(
	attachments: Array<{
		name: string;
		contentType: string;
		body?: string | Buffer;
		type?: string;
	}>,
	testRunId: string,
	testResultId: string,
	testTitle: string,
	attachmentErrors: Array<{ testTitle: string; attachmentName: string; error: string }>
): Promise<number> {
	if (!attachments || attachments.length === 0) {
		return 0;
	}

	let uploadedCount = 0;

	for (const attachment of attachments) {
		try {
			// Validate MIME type
			if (!isValidMimeType(attachment.contentType)) {
				attachmentErrors.push({
					testTitle,
					attachmentName: attachment.name,
					error: `Unsupported MIME type: ${attachment.contentType}. Allowed types: images (png, jpg, gif, webp, svg), videos (webm, mp4), archives (zip, gzip), traces (application/zip), text, logs, JSON`
				});
				continue;
			}

			// Convert body to Buffer
			let buffer: Buffer;

			if (!attachment.body) {
				attachmentErrors.push({
					testTitle,
					attachmentName: attachment.name,
					error: 'No body provided'
				});
				continue;
			}

			if (typeof attachment.body === 'string') {
				// For security, we ONLY accept base64-encoded strings
				// File paths are not supported to prevent arbitrary file system access
				try {
					buffer = Buffer.from(attachment.body, 'base64');
				} catch (err: any) {
					attachmentErrors.push({
						testTitle,
						attachmentName: attachment.name,
						error: `Failed to decode base64: ${err.message}`
					});
					continue;
				}
			} else if (Buffer.isBuffer(attachment.body)) {
				// Already a Buffer
				buffer = attachment.body;
			} else if (
				typeof attachment.body === 'object' &&
				attachment.body !== null &&
				'type' in attachment.body &&
				'data' in attachment.body
			) {
				// Buffer serialized as JSON: { type: 'Buffer', data: [bytes...] }
				const serializedBuffer = attachment.body as { type: string; data: number[] };
				if (serializedBuffer.type === 'Buffer' && Array.isArray(serializedBuffer.data)) {
					buffer = Buffer.from(serializedBuffer.data);
				} else {
					attachmentErrors.push({
						testTitle,
						attachmentName: attachment.name,
						error: `Invalid serialized buffer format`
					});
					continue;
				}
			} else {
				attachmentErrors.push({
					testTitle,
					attachmentName: attachment.name,
					error: `Invalid body type: ${typeof attachment.body}`
				});
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
			attachmentErrors.push({
				testTitle,
				attachmentName: attachment.name,
				error: err.message || 'Upload failed'
			});
		}
	}

	return uploadedCount;
}

/**
 * Suite cache for batch operations
 */
interface SuiteCache {
	[key: string]: string; // key: "projectId:parentId:name" -> suiteId
}

/**
 * Helper function to find or create a nested test suite hierarchy (with caching)
 */
async function findOrCreateSuiteHierarchy(
	suitePath: string[],
	projectId: string,
	userId: string,
	suiteCache: SuiteCache
): Promise<string | null> {
	if (suitePath.length === 0) return null;

	let parentId: string | null = null;

	for (const suiteName of suitePath) {
		// Check cache first
		const cacheKey: string = `${projectId}:${parentId || 'null'}:${suiteName}`;
		if (suiteCache[cacheKey]) {
			parentId = suiteCache[cacheKey];
			continue;
		}

		// Try to find existing suite with this name and parent
		let suite: any = await db.testSuite.findFirst({
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

		// Cache the result
		suiteCache[cacheKey] = suite.id;
		parentId = suite.id;
	}

	return parentId;
}

export default new Endpoint({ Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const userId = await requireApiAuth(evt);

		// Verify test run access
		const testRun = await db.testRun.findUnique({
			where: { id: input.testRunId },
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
			throw Error[404];
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
			throw Error[403];
		}

		// Process results
		const processedResults: Array<{
			testCaseId: string;
			testResultId: string;
			title: string;
			status: 'PASSED' | 'FAILED' | 'SKIPPED';
			duration: number | null;
			created: boolean;
			attachmentCount: number;
		}> = [];
		const errors: Array<{ testTitle: string; error: string }> = [];
		const attachmentErrors: Array<{
			testTitle: string;
			attachmentName: string;
			error: string;
		}> = [];

		// Initialize suite cache for batch operations
		// This prevents N+1 queries when multiple tests share the same suite hierarchy
		const suiteCache: SuiteCache = {};

		// Process results sequentially
		// NOTE: While this is a loop with individual DB operations, it's necessary because:
		// 1. We need to check for existing test cases before creating new ones
		// 2. Suite cache eliminates most N+1 queries for suite hierarchy
		// 3. Test cases are pre-loaded in memory for fast lookups
		// 4. Future optimization: Consider using Prisma transactions for atomic batches
		for (const result of input.results) {
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
				let suiteId: string | null = null;
				let testTitle = result.title || 'Untitled Test';

				if (result.fullTitle) {
					const parts = result.fullTitle.split('>').map((s) => s.trim());
					if (parts.length > 1) {
						// Last part is the test title, everything else is suite hierarchy
						testTitle = parts[parts.length - 1];
						const suitePath = parts.slice(0, -1);

						// Create or find the suite hierarchy (with caching)
						suiteId = await findOrCreateSuiteHierarchy(
							suitePath,
							testRun.projectId,
							userId,
							suiteCache
						);
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
							testRunId: input.testRunId,
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
						attachmentCount = await processAttachments(
							result.attachments,
							input.testRunId,
							testResult.id,
							result.title,
							attachmentErrors
						);
					}

					processedResults.push({
						testCaseId: newTestCase.id,
						testResultId: testResult.id,
						title: result.title,
						status,
						duration: result.duration || null,
						created: true,
						attachmentCount
					});
				} else {
					// Create test result for existing test case
					const testResult = await db.testResult.create({
						data: {
							id: generateTestResultId(),
							testCaseId: testCase.id,
							testRunId: input.testRunId,
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
						attachmentCount = await processAttachments(
							result.attachments,
							input.testRunId,
							testResult.id,
							result.title,
							attachmentErrors
						);
					}

					processedResults.push({
						testCaseId: testCase.id,
						testResultId: testResult.id,
						title: result.title,
						status,
						duration: result.duration || null,
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
					where: { testRunId: input.testRunId },
					select: { status: true }
				});

				const passed = allResults.filter((r) => r.status === 'PASSED').length;
				const failed = allResults.filter((r) => r.status === 'FAILED').length;
				const skipped = allResults.filter((r) => r.status === 'SKIPPED').length;
				const total = allResults.length;
				// Pass rate excludes skipped tests (industry standard)
				const executedTests = passed + failed;
				const passRate = executedTests > 0 ? Math.round((passed / executedTests) * 100) : 0;

				// Check if we should send completion notification
				const isComplete = testRun.status === 'COMPLETED';

				if (isComplete) {
					// Send test run completed notification
					const result = await notifyTestRunCompleted(testRun.project.teamId, {
						id: testRun.id,
						name: testRun.name,
						projectId: testRun.projectId,
						projectName: testRun.project.name,
						passRate,
						total,
						passed,
						failed,
						skipped
					});

					if (!result.success && result.errors && result.errors.length > 0) {
						console.error('Test run completion notification failed:', {
							testRunId: testRun.id,
							testRunName: testRun.name,
							integrationsSent: result.integrationsSent,
							integrationsFailed: result.integrationsFailed,
							errors: result.errors
						});
					}
				}

				// Send individual test case failure notifications
				const baseUrl = process.env.PUBLIC_BASE_URL || 'https://qastudio.dev';
				const failedTests = processedResults.filter((r) => r.status === 'FAILED');
				for (const failedTest of failedTests) {
					const result = await sendNotification(testRun.project.teamId, {
						event: 'TEST_CASE_FAILED',
						title: `❌ Test Failed: ${failedTest.title}`,
						message: `*Test Run:* ${testRun.name}\n*Project:* ${testRun.project.name}`,
						url: `${baseUrl}/projects/${testRun.projectId}/runs/${testRun.id}`,
						color: '#ff0000',
						fields: [
							{
								name: '⏱️ Duration',
								value: failedTest.duration ? `${failedTest.duration}ms` : 'N/A',
								inline: true
							},
							{
								name: '🔄 Status',
								value: 'Failed',
								inline: true
							}
						]
					});

					if (!result.success && result.errors && result.errors.length > 0) {
						console.error('Test case failure notification failed:', {
							testCaseTitle: failedTest.title,
							testRunId: testRun.id,
							integrationsSent: result.integrationsSent,
							integrationsFailed: result.integrationsFailed,
							errors: result.errors
						});
					}
				}
			} catch (notificationError: any) {
				// Don't fail the request if notifications fail
				console.error('Failed to send notifications:', {
					error: notificationError.message || 'Unknown error',
					testRunId: testRun.id,
					testRunName: testRun.name,
					stack: notificationError.stack
				});
			}
		}

		// Invalidate caches for test run, results, and project (counts may have changed)
		await deleteCache([
			CacheKeys.testRun(input.testRunId),
			CacheKeys.testResults(input.testRunId),
			CacheKeys.project(testRun.projectId)
		]);

		return {
			processedCount: processedResults.length,
			results: processedResults,
			errors: errors.length > 0 ? errors : undefined,
			attachmentErrors: attachmentErrors.length > 0 ? attachmentErrors : undefined
		};
	}
);
