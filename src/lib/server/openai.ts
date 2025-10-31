import OpenAI from 'openai';
import { OPENAI_SECRET_KEY } from '$env/static/private';

// Initialize OpenAI client
export const openai = new OpenAI({
	apiKey: OPENAI_SECRET_KEY
});

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
}): Promise<string> {
	const { testCaseTitle, testCaseDescription, errorMessage, stackTrace, testType, priority } =
		params;

	const prompt = `You are an expert QA engineer analyzing a failed test. Provide a concise diagnosis of what went wrong and potential fixes.

Test Case: ${testCaseTitle}
${testCaseDescription ? `Description: ${testCaseDescription}` : ''}
Test Type: ${testType}
Priority: ${priority}

${errorMessage ? `Error Message:\n${errorMessage}` : ''}
${stackTrace ? `\nStack Trace:\n${stackTrace.slice(0, 1000)}` : ''}

Provide:
1. What likely went wrong (2-3 sentences)
2. Potential root causes (2-3 bullet points)
3. Suggested fixes (2-3 bullet points)

Keep your response concise and actionable.`;

	try {
		const completion = await openai.chat.completions.create({
			model: 'gpt-5-mini',
			messages: [
				{
					role: 'system',
					content:
						'You are an expert QA engineer who helps diagnose test failures. Provide clear, actionable insights.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			max_completion_tokens: 500
		});

		const diagnosis = completion.choices[0]?.message?.content;
		if (!diagnosis) {
			throw new Error('No content in OpenAI response');
		}

		return diagnosis;
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

	const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

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
		const completion = await openai.chat.completions.create({
			model: 'gpt-5-mini',
			messages: [
				{
					role: 'system',
					content:
						'You are an expert QA engineer who analyzes test results and identifies patterns. Provide clear, strategic insights.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			max_completion_tokens: 600
		});

		const summary = completion.choices[0]?.message?.content;
		if (!summary) {
			throw new Error('No content in OpenAI response');
		}

		return summary;
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
${failures.slice(0, 15).map((f, i) => `${i + 1}. [${f.testType}${f.suiteName ? ` - ${f.suiteName}` : ''}] ${f.testCaseTitle}${f.errorMessage ? `\n   Error: ${f.errorMessage.slice(0, 150)}` : ''}`).join('\n')}

Analyze these failures and provide:
1. Common patterns (similar errors, affected areas, test types)
2. Likely root causes (infrastructure, code changes, environment issues)
3. Recommended investigation steps

Be concise and focus on actionable insights.`;

	try {
		const completion = await openai.chat.completions.create({
			model: 'gpt-5-mini',
			messages: [
				{
					role: 'system',
					content:
						'You are an expert QA engineer who identifies patterns in test failures. Focus on finding root causes.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			max_completion_tokens: 500
		});

		const analysis = completion.choices[0]?.message?.content;
		if (!analysis) {
			throw new Error('No content in OpenAI response');
		}

		return analysis;
	} catch (error) {
		console.error('OpenAI pattern analysis error:', error);
		throw new Error('Failed to analyze failure patterns');
	}
}
