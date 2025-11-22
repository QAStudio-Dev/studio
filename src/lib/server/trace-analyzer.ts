/**
 * AI-Powered Trace Analysis for Test Failures
 *
 * This module provides functionality to analyze Playwright trace files
 * and generate actionable insights for fixing test failures.
 */

import type { TestResult, TestStepResult, Attachment } from '$lib/../generated/client/client';
import AdmZip from 'adm-zip';
import OpenAI from 'openai';
import { OPENAI_SECRET_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_SECRET_KEY });

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

/**
 * Extract trace.zip contents and parse trace data
 */
export async function extractTraceData(traceBuffer: Buffer): Promise<any> {
	try {
		const zip = new AdmZip(traceBuffer);
		const zipEntries = zip.getEntries();

		// Find trace.json file
		const traceJsonEntry = zipEntries.find((entry) => entry.entryName === 'trace.json');

		if (!traceJsonEntry) {
			throw new Error('Invalid trace file - missing trace.json');
		}

		const traceData = JSON.parse(traceJsonEntry.getData().toString('utf8'));
		return traceData;
	} catch (error: any) {
		throw new Error(`Failed to extract trace data: ${error.message}`);
	}
}

/**
 * Build analysis context from trace data and test result
 */
export function buildAnalysisContext(
	traceData: any,
	testResult: TestResult & { testStepResults?: TestStepResult[] }
): TraceAnalysisContext {
	// Extract test steps
	const steps =
		testResult.testStepResults?.map((step) => ({
			title: step.title,
			status: step.status,
			error: step.error,
			duration: step.duration
		})) || [];

	// Extract last 10 actions before failure from trace
	const actions = (traceData.actions || []).slice(-10).map((action: any) => ({
		type: action.type || 'unknown',
		selector: action.selector,
		value: action.value,
		error: action.error
	}));

	// Get DOM snapshot at failure point
	const snapshots = traceData.snapshots || [];
	const lastSnapshot = snapshots[snapshots.length - 1];
	const domSnapshot = lastSnapshot?.html?.slice(0, 5000); // Limit to 5000 chars

	// Extract recent network requests
	const networkRequests = (traceData.network || []).slice(-5).map((req: any) => ({
		url: req.url || '',
		status: req.status,
		method: req.method || 'GET'
	}));

	// Extract console logs
	const consoleLogs = (traceData.console || []).slice(-10).map((log: any) => ({
		type: log.type || 'log',
		text: log.text || ''
	}));

	return {
		testTitle: testResult.fullTitle || 'Unknown Test',
		errorMessage: testResult.errorMessage,
		stackTrace: testResult.stackTrace,
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
		const completion = await openai.chat.completions.create({
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
