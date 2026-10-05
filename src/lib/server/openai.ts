import OpenAI from 'openai';
import { OPENAI_SECRET_KEY } from '$env/static/private';

// Initialize OpenAI client
export const openai = new OpenAI({
	apiKey: OPENAI_SECRET_KEY
});

const MODEL = 'gpt-5-mini';

/**
 * gpt-5-mini counts hidden reasoning tokens against max_completion_tokens.
 * A cap around 2000 can be spent entirely on reasoning, which returns
 * empty content with finish_reason "length".
 */
const MAX_COMPLETION_TOKENS = 16000;
const RETRY_MAX_COMPLETION_TOKENS = 32000;

async function createCompletion(
	system: string,
	prompt: string,
	options?: { maxCompletionTokens?: number; reasoningEffort?: 'low' | 'minimal' }
): Promise<string> {
	const maxCompletionTokens = options?.maxCompletionTokens ?? MAX_COMPLETION_TOKENS;
	const reasoningEffort = options?.reasoningEffort ?? 'low';

	const completion = await openai.chat.completions.create({
		model: MODEL,
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: prompt }
		],
		max_completion_tokens: maxCompletionTokens,
		reasoning_effort: reasoningEffort
	});

	const content = completion.choices[0]?.message?.content?.trim();
	if (content) {
		return content;
	}

	const finishReason = completion.choices[0]?.finish_reason;
	const reasoningTokens = completion.usage?.completion_tokens_details?.reasoning_tokens;

	// Reasoning consumed the budget before any visible text. Retry once with a
	// larger cap and less thinking so the answer can still be produced.
	if (finishReason === 'length' && maxCompletionTokens < RETRY_MAX_COMPLETION_TOKENS) {
		console.warn(
			`[OpenAI] Empty completion (finish_reason=length, reasoning_tokens=${reasoningTokens ?? 'unknown'}, max_completion_tokens=${maxCompletionTokens}). Retrying.`
		);
		return createCompletion(system, prompt, {
			maxCompletionTokens: RETRY_MAX_COMPLETION_TOKENS,
			reasoningEffort: 'minimal'
		});
	}

	throw new Error(`No content in OpenAI response. Finish reason: ${finishReason}`);
}

/**
 * Diagnose a failed test and provide insights on what might have gone wrong
 */
export async function diagnoseFailedTest(params: {
	testCaseTitle: string;
	testCaseDescription?: string;
	errorMessage?: string;
	stackTrace?: string;
	testType: string;
	priority: string;
	errorContext?: string;
}): Promise<string> {
	const {
		testCaseTitle,
		testCaseDescription,
		errorMessage,
		stackTrace,
		testType,
		priority,
		errorContext
	} = params;

	const prompt = `You are an expert QA engineer analyzing a failed test. Provide a concise diagnosis of what went wrong and potential fixes.

Test Case: ${testCaseTitle}
${testCaseDescription ? `Description: ${testCaseDescription}` : ''}
Test Type: ${testType}
Priority: ${priority}

${errorMessage ? `Error Message:\n${errorMessage}` : ''}
${stackTrace ? `\nStack Trace:\n${stackTrace.slice(0, 1000)}` : ''}
${errorContext ? `\nError Context (Page Snapshot):\n${errorContext.slice(0, 2000)}` : ''}

Provide:
1. What likely went wrong (2-3 sentences)
2. Potential root causes (2-3 bullet points)
3. Suggested fixes (2-3 bullet points)

${errorContext ? 'Use the error context to understand the page state when the failure occurred.' : ''}
Keep your response concise and actionable.`;

	try {
		return await createCompletion(
			'You are an expert QA engineer who helps diagnose test failures. Provide clear, actionable insights.',
			prompt
		);
	} catch (error) {
		console.error('OpenAI diagnosis error:', error);
		throw new Error('Failed to generate AI diagnosis');
	}
}

/**
 * Generate a summary of test run results with insights on failure patterns
 */
export async function summarizeTestRun(params: {
	testRunName: string;
	totalTests: number;
	passed: number;
	failed: number;
	blocked: number;
	skipped: number;
	failedTests: Array<{
		title: string;
		errorMessage?: string;
		testType: string;
		priority: string;
	}>;
}): Promise<string> {
	const { testRunName, totalTests, passed, failed, blocked, skipped, failedTests } = params;

	// Pass rate excludes skipped tests (industry standard)
	const executedTests = passed + failed;
	const passRate = executedTests > 0 ? Math.round((passed / executedTests) * 100) : 0;

	// Limit failed tests in prompt to avoid token limits
	const failedTestsPreview = failedTests.slice(0, 10);

	const prompt = `You are an expert QA engineer analyzing test run results. Provide insights and identify patterns.

Test Run: ${testRunName}
Total Tests: ${totalTests}
Passed: ${passed} (${passRate}%)
Failed: ${failed}
Blocked: ${blocked}
Skipped: ${skipped}

${failed > 0 ? `Failed Tests (showing ${failedTestsPreview.length} of ${failed}):\n${failedTestsPreview.map((t, i) => `${i + 1}. [${t.testType}] ${t.title}${t.errorMessage ? `\n   Error: ${t.errorMessage.slice(0, 100)}` : ''}`).join('\n')}` : ''}

Provide:
1. Overall health assessment (1-2 sentences)
2. Patterns in failures (if any) - look for common test types, error types, or areas
3. Priority recommendations - what should be fixed first
4. Key insights for the team

Keep your response concise and actionable (under 300 words).`;

	try {
		return await createCompletion(
			'You are an expert QA engineer who analyzes test results and identifies patterns. Provide clear, strategic insights.',
			prompt
		);
	} catch (error) {
		console.error('OpenAI summary error:', error);
		throw new Error('Failed to generate AI summary');
	}
}

/**
 * Analyze patterns across multiple test failures to identify root causes
 */
export async function analyzeFailurePatterns(params: {
	failures: Array<{
		testCaseTitle: string;
		errorMessage?: string;
		testType: string;
		suiteName?: string;
	}>;
}): Promise<string> {
	const { failures } = params;

	if (failures.length === 0) {
		return 'No failures to analyze.';
	}

	const prompt = `You are an expert QA engineer analyzing patterns across multiple test failures.

Failed Tests (${failures.length} total):
${failures
	.slice(0, 15)
	.map(
		(f, i) =>
			`${i + 1}. [${f.testType}${f.suiteName ? ` - ${f.suiteName}` : ''}] ${f.testCaseTitle}${f.errorMessage ? `\n   Error: ${f.errorMessage.slice(0, 150)}` : ''}`
	)
	.join('\n')}

Analyze these failures and provide:
1. Common patterns (similar errors, affected areas, test types)
2. Likely root causes (infrastructure, code changes, environment issues)
3. Recommended investigation steps

Be concise and focus on actionable insights.`;

	try {
		return await createCompletion(
			'You are an expert QA engineer who identifies patterns in test failures. Focus on finding root causes.',
			prompt
		);
	} catch (error) {
		console.error('OpenAI pattern analysis error:', error);
		throw new Error('Failed to analyze failure patterns');
	}
}
