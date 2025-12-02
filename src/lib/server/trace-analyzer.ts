/**
 * AI-Powered Trace Analysis for Test Failures
 *
 * This module provides functionality to analyze Playwright trace files
 * and generate actionable insights for fixing test failures.
 */

import type { TestResult, TestStepResult, Attachment } from '$prisma/client';
import AdmZip from 'adm-zip';
import OpenAI from 'openai';
import { OPENAI_SECRET_KEY } from '$env/static/private';

// Lazy-initialize OpenAI client to allow module import without API key (for build/test)
let openai: OpenAI;

function getOpenAIClient(): OpenAI {
	if (!openai) {
		if (!OPENAI_SECRET_KEY) {
			throw new Error(
				'OPENAI_SECRET_KEY environment variable is not set. AI trace analysis requires a valid OpenAI API key.'
			);
		}
		openai = new OpenAI({ apiKey: OPENAI_SECRET_KEY });
	}
	return openai;
}

export interface TraceAnalysisContext {
	testTitle: string;
	errorMessage?: string | null;
	stackTrace?: string | null;
	steps: Array<{
		title: string;
		status: string;
		error?: string | null;
		duration?: number | null;
	}>;
	actions: Array<{
		type: string;
		selector?: string;
		value?: string;
		error?: string;
	}>;
	domSnapshot?: string;
	networkRequests: Array<{
		url: string;
		status?: number;
		method: string;
	}>;
	consoleLogs: Array<{
		type: string;
		text: string;
	}>;
}

export interface TraceAnalysisResult {
	rootCause: string;
	category:
		| 'STALE_LOCATOR'
		| 'TIMING_ISSUE'
		| 'NETWORK_ERROR'
		| 'ASSERTION_FAILURE'
		| 'DATA_ISSUE'
		| 'ENVIRONMENT_ISSUE'
		| 'CONFIGURATION_ERROR'
		| 'OTHER';
	suggestedFix: string;
	fixCode?: string;
	confidence: number;
	additionalNotes?: string;
}

// Security limits for trace file processing
const MAX_TRACE_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ZIP_ENTRIES = 1000; // Maximum files in zip
const MAX_INDIVIDUAL_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

/**
 * Extract trace.zip contents and parse trace data
 */
export async function extractTraceData(traceBuffer: Buffer): Promise<any> {
	try {
		// Validate total file size
		if (traceBuffer.length > MAX_TRACE_FILE_SIZE) {
			throw new Error(
				`Trace file too large (${(traceBuffer.length / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_TRACE_FILE_SIZE / 1024 / 1024}MB.`
			);
		}

		const zip = new AdmZip(traceBuffer);
		const zipEntries = zip.getEntries();

		// Validate number of entries
		if (zipEntries.length > MAX_ZIP_ENTRIES) {
			throw new Error(
				`Trace file contains too many entries (${zipEntries.length}). Maximum is ${MAX_ZIP_ENTRIES}.`
			);
		}

		// Validate individual file sizes
		for (const entry of zipEntries) {
			if (entry.header.size > MAX_INDIVIDUAL_FILE_SIZE) {
				throw new Error(
					`File '${entry.entryName}' is too large (${(entry.header.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${MAX_INDIVIDUAL_FILE_SIZE / 1024 / 1024}MB.`
				);
			}
		}

		// Playwright trace files contain .trace files (not trace.json)
		// These are JSON lines format with one action per line
		const traceFiles = zipEntries.filter((entry) => entry.entryName.endsWith('.trace'));

		if (traceFiles.length === 0) {
			// Log available files for debugging
			const availableFiles = zipEntries.map((e) => e.entryName).join(', ');
			console.error('Available files in trace archive:', availableFiles);
			throw new Error(
				`Invalid trace file - no .trace files found. Available files: ${availableFiles}`
			);
		}

		// Parse the first trace file (usually there's only one for single-page tests)
		const traceContent = traceFiles[0].getData().toString('utf8');

		// Playwright traces are JSON lines format - parse each line
		const traceEvents = traceContent
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		// Return trace events for analysis
		return {
			events: traceEvents,
			fileName: traceFiles[0].entryName,
			eventCount: traceEvents.length
		};
	} catch (error: any) {
		throw new Error(`Failed to extract trace data: ${error.message}`);
	}
}

/**
 * Sanitize text to remove potential PII
 * Redacts common patterns like emails, tokens, API keys, passwords
 */
function sanitizePII(text: string | null | undefined): string {
	if (!text) return '';

	let sanitized = text;

	// Redact email addresses
	sanitized = sanitized.replace(
		/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
		'[EMAIL]'
	);

	// Redact potential API keys/tokens (long alphanumeric strings)
	sanitized = sanitized.replace(/\b[A-Za-z0-9]{32,}\b/g, '[TOKEN]');

	// Redact JWT tokens
	sanitized = sanitized.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT]');

	// Redact Authorization headers
	sanitized = sanitized.replace(
		/(authorization|auth|token|api[_-]?key)[\s:=]+[^\s&"']+/gi,
		'$1: [REDACTED]'
	);

	// Redact password fields (value="..." or password: "...")
	sanitized = sanitized.replace(/(password|passwd|pwd)[\s:=]+"[^"]*"/gi, '$1: "[REDACTED]"');

	// Redact credit card numbers
	sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');

	// Redact social security numbers
	sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

	return sanitized;
}

/**
 * Build analysis context from trace data and test result
 */
export function buildAnalysisContext(
	traceData: any,
	testResult: TestResult & { testStepResults?: TestStepResult[] }
): TraceAnalysisContext {
	// Extract test steps (sanitize errors)
	const steps =
		testResult.testStepResults?.map((step) => ({
			title: step.title,
			status: step.status,
			error: sanitizePII(step.error),
			duration: step.duration
		})) || [];

	// Parse Playwright trace events
	const events = traceData.events || [];

	// Extract actions from trace events
	const actionEvents = events.filter((e: any) => e.type === 'action').slice(-10);
	const actions = actionEvents.map((event: any) => ({
		type: event.apiName || 'unknown',
		selector: event.params?.selector,
		value: sanitizePII(event.params?.value),
		error: sanitizePII(event.error?.message)
	}));

	// Extract DOM snapshots (if available)
	const snapshotEvents = events.filter((e: any) => e.type === 'snapshot');
	const lastSnapshot = snapshotEvents[snapshotEvents.length - 1];
	let domSnapshot = '';
	if (lastSnapshot?.snapshot) {
		const htmlSubstring =
			typeof lastSnapshot.snapshot === 'string'
				? lastSnapshot.snapshot.substring(0, 5000)
				: '';
		domSnapshot = sanitizePII(htmlSubstring);
	}

	// Extract network requests from events
	const networkEvents = events
		.filter((e: any) => e.type === 'resource' || e.type === 'route')
		.slice(-5);
	const networkRequests = networkEvents.map((event: any) => {
		const url = event.params?.url || event.url || '';
		const sanitizedUrl = url.split('?')[0];
		return {
			url: sanitizedUrl,
			status: event.params?.status || event.status,
			method: event.params?.method || event.method || 'GET'
		};
	});

	// Extract console logs from events
	const consoleEvents = events.filter((e: any) => e.type === 'console').slice(-10);
	const consoleLogs = consoleEvents.map((event: any) => ({
		type: event.params?.type || 'log',
		text: sanitizePII(event.params?.text || event.text || '')
	}));

	return {
		testTitle: testResult.fullTitle || 'Unknown Test',
		errorMessage: sanitizePII(testResult.errorMessage),
		stackTrace: sanitizePII(testResult.stackTrace),
		steps,
		actions,
		domSnapshot,
		networkRequests,
		consoleLogs
	};
}

/**
 * Analyze trace context using AI
 */
export async function analyzeWithAI(context: TraceAnalysisContext): Promise<TraceAnalysisResult> {
	try {
		const client = getOpenAIClient();
		const completion = await client.chat.completions.create({
			model: 'gpt-4-turbo',
			temperature: 0.3, // Lower temperature for more consistent analysis
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content: getSystemPrompt()
				},
				{
					role: 'user',
					content: JSON.stringify(context, null, 2)
				}
			]
		});

		const result = JSON.parse(completion.choices[0].message.content || '{}');

		// Validate and normalize the result
		return {
			rootCause: result.rootCause || 'Unable to determine root cause',
			category: validateCategory(result.category),
			suggestedFix: result.suggestedFix || 'No fix suggestion available',
			fixCode: result.fixCode || undefined,
			confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
			additionalNotes: result.additionalNotes || undefined
		};
	} catch (error: any) {
		throw new Error(`AI analysis failed: ${error.message}`);
	}
}

/**
 * Get the system prompt for the AI analyzer
 */
function getSystemPrompt(): string {
	return `You are an expert Playwright test debugger and automation engineer. Analyze test failure traces and provide actionable fixes.

Your task is to:
1. Identify the root cause of the test failure
2. Categorize the issue
3. Provide a detailed fix suggestion
4. Optionally provide exact code to fix the issue
5. Rate your confidence in the analysis

Return a JSON object with this exact structure:
{
  "rootCause": "Brief explanation of what went wrong (1-2 sentences)",
  "category": "CATEGORY_NAME",
  "suggestedFix": "Detailed explanation of how to fix the issue (2-4 sentences)",
  "fixCode": "Exact code snippet to fix the issue (if applicable)",
  "confidence": 0.85,
  "additionalNotes": "Any other relevant information"
}

## Categories and Patterns:

### STALE_LOCATOR
Element selector no longer works (element moved, ID changed, class removed, etc.)
**Fixes:**
- Use more stable selectors: role-based (getByRole), label (getByLabel), testid (getByTestId)
- Add data-testid attributes to elements
- Use text content if structure is dynamic

**Example Fix Code:**
\`\`\`typescript
// Instead of:
await page.locator('#submit-btn').click();

// Use:
await page.getByRole('button', { name: 'Submit' }).click();
// or
await page.getByTestId('submit-button').click();
\`\`\`

### TIMING_ISSUE
Race conditions, animations not complete, async operations not awaited
**Fixes:**
- Add explicit waits: waitFor(), waitForLoadState()
- Wait for specific network requests: waitForResponse()
- Increase timeouts only as last resort
- Use auto-waiting locators (built into Playwright)

**Example Fix Code:**
\`\`\`typescript
// Instead of:
await page.locator('.modal').click();

// Use:
await page.locator('.modal').waitFor({ state: 'visible' });
await page.locator('.modal').click();

// Or wait for network:
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/api/data')),
  page.getByRole('button', { name: 'Load Data' }).click()
]);
\`\`\`

### NETWORK_ERROR
API call failed, timeout, 500 error, CORS issues
**Fixes:**
- Check API endpoint health
- Verify authentication tokens
- Mock failing endpoints if external
- Add retry logic for flaky APIs

**Example Fix Code:**
\`\`\`typescript
// Wait for API response before assertions:
await page.waitForResponse(
  resp => resp.url().includes('/api/user') && resp.status() === 200
);

// Or mock the API:
await page.route('**/api/user', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ name: 'Test User' })
  });
});
\`\`\`

### ASSERTION_FAILURE
Expected value doesn't match actual value
**Fixes:**
- Check if test data changed
- Use more flexible matchers (toContain vs toBe)
- Verify dynamic content with regex
- Check for whitespace or formatting differences

**Example Fix Code:**
\`\`\`typescript
// Instead of exact match:
await expect(page.locator('.price')).toHaveText('$19.99');

// Use flexible matching:
await expect(page.locator('.price')).toContainText('19.99');
// or regex:
await expect(page.locator('.price')).toHaveText(/\\$\\d+\\.\\d{2}/);
\`\`\`

### DATA_ISSUE
Test data missing, invalid, or changed
**Fixes:**
- Set up test data before test run
- Use test fixtures or factories
- Clear state between tests
- Verify data exists before assertions

**Example Fix Code:**
\`\`\`typescript
// Set up data via API:
await request.post('/api/products', {
  data: {
    name: 'Test Product',
    price: 19.99
  }
});

// Then run test:
await page.goto('/products');
await expect(page.getByText('Test Product')).toBeVisible();
\`\`\`

### ENVIRONMENT_ISSUE
Environment-specific problems: missing env vars, wrong URLs, permissions
**Fixes:**
- Verify environment variables are set
- Check base URL configuration
- Confirm authentication setup
- Validate test environment state

### CONFIGURATION_ERROR
Playwright config issues, wrong browser, missing setup
**Fixes:**
- Check playwright.config.ts settings
- Verify browser installation
- Review project/browser configurations
- Check for missing global setup/teardown

## Analysis Guidelines:

1. **Prioritize common issues**: Stale locators and timing issues are most common
2. **Look for patterns**: Multiple failures on same element = likely locator issue
3. **Check sequence**: If test passed before, what changed?
4. **Consider environment**: Network errors might be environment-specific
5. **Confidence scoring**:
   - 0.9+: Very clear issue with obvious fix
   - 0.7-0.9: Likely cause identified, fix should work
   - 0.5-0.7: Possible cause, fix is a suggestion
   - <0.5: Unclear, multiple possibilities

6. **Provide code when possible**: Users want copy-paste fixes
7. **Be specific**: Don't say "fix the selector", show the exact new selector
8. **Consider maintainability**: Suggest robust, long-term solutions

Analyze the provided trace context and return your analysis.`;
}

/**
 * Validate and normalize category
 */
function validateCategory(category: any): TraceAnalysisResult['category'] {
	const validCategories = [
		'STALE_LOCATOR',
		'TIMING_ISSUE',
		'NETWORK_ERROR',
		'ASSERTION_FAILURE',
		'DATA_ISSUE',
		'ENVIRONMENT_ISSUE',
		'CONFIGURATION_ERROR',
		'OTHER'
	];

	if (validCategories.includes(category)) {
		return category as TraceAnalysisResult['category'];
	}

	return 'OTHER';
}

/**
 * Main function to analyze a trace file
 */
export async function analyzeTrace(
	traceBuffer: Buffer,
	testResult: TestResult & { testStepResults?: TestStepResult[] }
): Promise<TraceAnalysisResult> {
	// Extract trace data
	const traceData = await extractTraceData(traceBuffer);

	// Build analysis context
	const context = buildAnalysisContext(traceData, testResult);

	// Analyze with AI
	const analysis = await analyzeWithAI(context);

	return analysis;
}
