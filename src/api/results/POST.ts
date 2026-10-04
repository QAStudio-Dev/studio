import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { uploadToBlob, generateAttachmentPath } from '$lib/server/blob-storage';
import {
	generateTestCaseId,
	generateTestResultId,
	generateTestSuiteId,
	generateAttachmentId
} from '$lib/server/ids';
import { mapStatus, parseDateTime, processTestSteps, type TestStepInput } from './steps';

// Define location schema for reuse
const LocationSchema = z.object({
	file: z.string(),
	line: z.number(),
	column: z.number().optional()
});

const BaseTestStep = z.object({
	title: z.string().describe('Step title'),
	category: z
		.enum(['hook', 'test.step', 'pw:api', 'expect', 'fixture', 'other'])
		.optional()
		.describe('Step category'),
	status: z
		.enum(['passed', 'failed', 'skipped', 'timedout'])
		.optional()
		.describe('Step execution status'),
	startTime: z.string().optional().describe('ISO 8601 timestamp when step started'),
	duration: z.number().optional().describe('Step duration in milliseconds'),
	error: z.string().optional().describe('Error message if step failed'),
	stackTrace: z.string().optional().describe('Stack trace for failures'),
	location: LocationSchema.optional().describe('Source code location')
});

// Extend with recursive steps property using proper generic type
const TestStep: z.ZodType<TestStepInput> = BaseTestStep.extend({
	steps: z
		.lazy(() => TestStep.array().optional().default([]))
		.openapi({ type: 'array', items: { type: 'object' } })
});

export const Input = z.object({
	testRunId: z.string().describe('ID of the test run'),
	results: z
		.array(
			z.object({
				testCaseId: z
					.string()
					.optional()
					.describe('Existing QA Studio test case ID when known'),
				title: z.string().describe('Test case title'),
				fullTitle: z
					.string()
					.max(500)
					.optional()
					.describe('Full hierarchical title (e.g., "Suite > Test")'),
				status: z
					.enum(['passed', 'failed', 'skipped', 'timedout', 'interrupted', 'timedOut'])
					.describe('Test execution status'),
				duration: z.number().optional().describe('Test duration in milliseconds'),
				errorMessage: z.string().optional().describe('Error message if test failed'),
				error: z.string().optional().describe('Alternative error field'),
				stackTrace: z.string().optional().describe('Stack trace for failures'),
				errorSnippet: z.string().optional().describe('Error context snippet'),
				errorLocation: LocationSchema.optional().describe('Location where error occurred'),
				startTime: z.string().optional().describe('ISO 8601 timestamp when test started'),
				endTime: z.string().optional().describe('ISO 8601 timestamp when test ended'),
				retry: z.number().optional().describe('Retry attempt number (0 for first attempt)'),
				projectName: z
					.string()
					.optional()
					.describe('Project/browser name (e.g., "chromium")'),
				metadata: z
					.object({
						tags: z.array(z.string()).optional(),
						location: LocationSchema.optional()
					})
					.optional()
					.describe('Additional test metadata'),
				steps: z.array(TestStep).optional().default([]).describe('Test execution steps'),
				consoleOutput: z
					.object({
						stdout: z.string().optional(),
						stderr: z.string().optional()
					})
					.optional()
					.describe('Console output captured during test'),
				attachments: z
					.array(
						z.object({
							name: z.string(),
							contentType: z.string(),
							body: z.any().optional(),
							type: z.string().optional()
						})
					)
					.optional()
					.default([])
					.describe('Screenshots, logs, videos, etc.')
			})
		)
		.describe('Array of test results to submit')
});

export const Output = z.object({
	processedCount: z.number().describe('Number of results successfully processed'),
	duplicatesSkipped: z.number().optional().describe('Number of duplicate results skipped'),
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

type TestResultData = {
	testCaseId?: string;
	title: string;
	fullTitle?: string;
	duration?: number;
	errorMessage?: string;
	error?: string;
	stackTrace?: string;
	errorSnippet?: string;
	errorLocation?: any;
	startTime?: string;
	endTime?: string;
	retry?: number;
	projectName?: string;
	metadata?: any;
	consoleOutput?: any;
	attachments?: any[];
	steps?: TestStepInput[];
};

/**
 * Helper function to create test result with attachments and steps
 * Reduces duplication between new and existing test case paths
 * Uses upsert based on testCaseId + testRunId + retry to prevent duplicates when reporter retries
 */
async function createTestResultWithSteps(
	testCaseId: string,
	testRunId: string,
	userId: string,
	status: 'PASSED' | 'FAILED' | 'SKIPPED',
	result: TestResultData,
	attachmentErrors: any[]
): Promise<{ testResult: any; attachmentCount: number; isNew: boolean }> {
	const retry = result.retry ?? 0;

	let testResult;
	let isNew = true;

	try {
		// Try to create new test result
		testResult = await db.testResult.create({
			data: {
				id: generateTestResultId(),
				testCaseId,
				testRunId,
				status,
				fullTitle: result.fullTitle,
				duration: result.duration || 0,
				errorMessage: result.errorMessage || result.error,
				stackTrace: result.stackTrace,
				errorSnippet: result.errorSnippet,
				errorLocation: result.errorLocation,
				startTime: parseDateTime(result.startTime),
				endTime: parseDateTime(result.endTime),
				retry,
				projectName: result.projectName || 'default',
				metadata: result.metadata,
				consoleOutput: result.consoleOutput,
				executedBy: userId,
				executedAt: new Date()
			}
		});
	} catch (error: any) {
		// Handle unique constraint violation (reporter retry/concurrent creation)
		if (error.code === 'P2002') {
			// Duplicate detected - fetch and return existing result
			// This is expected when the reporter retries after a timeout
			const existingResult = await db.testResult.findFirst({
				where: {
					testCaseId,
					testRunId,
					retry
				},
				include: {
					attachments: true
				}
			});

			if (existingResult) {
				return {
					testResult: existingResult,
					attachmentCount: existingResult.attachments.length,
					isNew: false
				};
			}
		}

		// Re-throw if not a unique constraint violation or if we couldn't find the existing result
		throw error;
	}

	// Process attachments if any
	let attachmentCount = 0;
	if (result.attachments && Array.isArray(result.attachments) && result.attachments.length > 0) {
		attachmentCount = await processAttachments(
			result.attachments,
			testRunId,
			testResult.id,
			result.title,
			attachmentErrors
		);
	}

	// Process test steps if any
	if (result.steps && Array.isArray(result.steps)) {
		try {
			await processTestSteps(result.steps, testResult.id);
		} catch (err: any) {
			console.error(
				`Failed to process steps for testResultId ${testResult.id}:`,
				err.message
			);
			// Don't fail the entire result if steps processing fails
		}
	}

	return { testResult, attachmentCount, isNew };
}

/**
 * Helper function to process and upload attachments for a test result
 * Uploads attachments in parallel for better performance
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

	// Process all attachments in parallel for better performance
	const uploadPromises = attachments.map(async (attachment) => {
		try {
			// Validate MIME type
			if (!isValidMimeType(attachment.contentType)) {
				attachmentErrors.push({
					testTitle,
					attachmentName: attachment.name,
					error: `Unsupported MIME type: ${attachment.contentType}. Allowed types: images (png, jpg, gif, webp, svg), videos (webm, mp4), archives (zip, gzip), traces (application/zip), text, logs, JSON`
				});
				return false;
			}

			// Convert body to Buffer
			let buffer: Buffer;

			if (!attachment.body) {
				attachmentErrors.push({
					testTitle,
					attachmentName: attachment.name,
					error: 'No body provided'
				});
				return false;
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
					return false;
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
					return false;
				}
			} else {
				attachmentErrors.push({
					testTitle,
					attachmentName: attachment.name,
					error: `Invalid body type: ${typeof attachment.body}`
				});
				return false;
			}

			// Add proper extension to the filename if missing
			const extension = getExtensionFromMimeType(attachment.contentType);
			const nameWithExt = attachment.name.includes('.')
				? attachment.name
				: `${attachment.name}.${extension}`;

			// Generate unique filename
			const filename = generateAttachmentPath(nameWithExt, testRunId, testResultId);

			// Upload to blob storage (parallel)
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

			return true; // Success
		} catch (err: any) {
			console.error(`Failed to upload attachment ${attachment.name}:`, err);
			attachmentErrors.push({
				testTitle,
				attachmentName: attachment.name,
				error: err.message || 'Upload failed'
			});
			return false; // Failure
		}
	});

	// Wait for all uploads to complete
	const results = await Promise.all(uploadPromises);

	// Count successful uploads
	return results.filter((success) => success).length;
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
	_userId: string, // Unused for now - TestSuite doesn't have createdBy field
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

type CaseRef = { id: string; title: string; suiteId: string | null };

const TITLE_LOOKUP_CHUNK_SIZE = 50;

function caseLookupKey(title: string, suiteId: string | null): string {
	return `${suiteId ?? 'null'}:${title.toLowerCase()}`;
}

function rememberCase(
	tc: CaseRef,
	caseById: Map<string, CaseRef>,
	casesByTitleSuite: Map<string, CaseRef[]>
): void {
	caseById.set(tc.id, tc);
	const key = caseLookupKey(tc.title, tc.suiteId);
	const existing = casesByTitleSuite.get(key);
	if (!existing) {
		casesByTitleSuite.set(key, [tc]);
		return;
	}
	if (!existing.some((item) => item.id === tc.id)) {
		existing.push(tc);
	}
}

function findCaseByTitleSuite(
	title: string,
	suiteId: string | null,
	casesByTitleSuite: Map<string, CaseRef[]>
): CaseRef | undefined {
	const matches = casesByTitleSuite.get(caseLookupKey(title, suiteId));
	if (!matches || matches.length === 0) return undefined;
	return matches.find((tc) => tc.title === title) ?? matches[0];
}

export default new Endpoint({ Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const startTime = Date.now();
		const userId = await requireApiAuth(evt);
		console.log(
			`[Results API] Processing ${input.results.length} results for run ${input.testRunId}`
		);

		const testRun = await db.testRun.findUnique({
			where: { id: input.testRunId },
			include: {
				project: {
					select: {
						id: true,
						name: true,
						teamId: true,
						createdBy: true
					}
				}
			}
		});

		if (!testRun) {
			throw Error[404];
		}

		const user = await db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		});

		const hasAccess =
			testRun.project.createdBy === userId ||
			(testRun.project.teamId && user?.teamId === testRun.project.teamId);

		if (!hasAccess) {
			throw Error[403];
		}

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
		let duplicateCount = 0;

		const suiteCache: SuiteCache = {};
		const caseById = new Map<string, CaseRef>();
		const casesByTitleSuite = new Map<string, CaseRef[]>();
		const cacheCase = (tc: CaseRef) => rememberCase(tc, caseById, casesByTitleSuite);

		const requestedIds = [
			...new Set(
				input.results
					.map((result) => result.testCaseId)
					.filter((id): id is string => Boolean(id))
			)
		];
		if (requestedIds.length > 0) {
			const existingById = await db.testCase.findMany({
				where: { projectId: testRun.projectId, id: { in: requestedIds } },
				select: { id: true, title: true, suiteId: true }
			});
			existingById.forEach(cacheCase);
		}

		type PreparedResult = {
			result: (typeof input.results)[number];
			status: 'PASSED' | 'FAILED' | 'SKIPPED';
			suiteId: string | null;
			testTitle: string;
		};
		const prepared: PreparedResult[] = [];

		for (const result of input.results) {
			let suiteId: string | null = null;
			let testTitle = result.title || 'Untitled Test';

			if (result.fullTitle) {
				const parts = result.fullTitle.split('>').map((s) => s.trim());
				if (parts.length > 1) {
					testTitle = parts[parts.length - 1];
					suiteId = await findOrCreateSuiteHierarchy(
						parts.slice(0, -1),
						testRun.projectId,
						userId,
						suiteCache
					);
				}
			}

			prepared.push({
				result,
				status: mapStatus(result.status),
				suiteId,
				testTitle
			});
		}

		const titles = [...new Set(prepared.map((item) => item.testTitle))];
		for (let i = 0; i < titles.length; i += TITLE_LOOKUP_CHUNK_SIZE) {
			const titleChunk = titles.slice(i, i + TITLE_LOOKUP_CHUNK_SIZE);
			const existingByTitle = await db.testCase.findMany({
				where: {
					projectId: testRun.projectId,
					OR: titleChunk.map((title) => ({
						title: { equals: title, mode: 'insensitive' as const }
					}))
				},
				select: { id: true, title: true, suiteId: true }
			});
			existingByTitle.forEach(cacheCase);
		}

		for (const item of prepared) {
			try {
				let testCase: CaseRef | undefined;
				let created = false;

				if (item.result.testCaseId) {
					testCase = caseById.get(item.result.testCaseId);
					if (!testCase) {
						console.warn(
							`[Results API] Unknown testCaseId "${item.result.testCaseId}" for "${item.result.title}"; matching by title and suite instead`
						);
					}
				}

				if (!testCase) {
					testCase = findCaseByTitleSuite(
						item.testTitle,
						item.suiteId,
						casesByTitleSuite
					);
				}

				if (!testCase) {
					const newTestCase = await db.testCase.create({
						data: {
							id: generateTestCaseId(),
							title: item.testTitle,
							projectId: testRun.projectId,
							suiteId: item.suiteId,
							createdBy: userId,
							priority: 'MEDIUM',
							type: 'FUNCTIONAL',
							automationStatus: 'AUTOMATED'
						}
					});
					testCase = {
						id: newTestCase.id,
						title: newTestCase.title,
						suiteId: newTestCase.suiteId
					};
					cacheCase(testCase);
					created = true;
				}

				const { testResult, attachmentCount, isNew } = await createTestResultWithSteps(
					testCase.id,
					input.testRunId,
					userId,
					item.status,
					item.result,
					attachmentErrors
				);

				if (!isNew) {
					duplicateCount++;
				} else {
					processedResults.push({
						testCaseId: testCase.id,
						testResultId: testResult.id,
						title: item.result.title,
						status: item.status,
						duration: item.result.duration || null,
						created,
						attachmentCount
					});
				}
			} catch (err: any) {
				errors.push({
					testTitle: item.result.title,
					error: err.message || 'Unknown error'
				});
			}
		}

		const response = {
			processedCount: processedResults.length,
			duplicatesSkipped: duplicateCount,
			results: processedResults,
			errors: errors.length > 0 ? errors : undefined,
			attachmentErrors: attachmentErrors.length > 0 ? attachmentErrors : undefined
		};

		const duration = Date.now() - startTime;
		const responseSize = JSON.stringify(response).length;
		const totalAttachments = processedResults.reduce((sum, r) => sum + r.attachmentCount, 0);
		const stats = [];
		if (duplicateCount > 0) {
			stats.push(`${duplicateCount} duplicates skipped`);
		}
		if (totalAttachments > 0) {
			stats.push(`${totalAttachments} attachments uploaded`);
		}

		const statsStr = stats.length > 0 ? ` (${stats.join(', ')})` : '';
		console.log(
			`[Results API] Processed ${response.processedCount} results${statsStr} in ${duration}ms, response size: ${(responseSize / 1024).toFixed(1)}KB`
		);

		return response;
	}
);
