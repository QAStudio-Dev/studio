import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requirePremiumFeature } from '$lib/server/auth';
import { summarizeTestRun, analyzeFailurePatterns } from '$lib/server/openai';

/**
 * Generate AI summary for a test run with failure pattern analysis
 * POST /api/ai/summarize-run
 *
 * Requires Pro subscription
 *
 * Body:
 * - testRunId: string
 */
export const POST: RequestHandler = async (event) => {
	// Require active pro subscription for AI features
	const { userId, user } = await requirePremiumFeature(event, 'AI-powered test run analysis');

	const body = await event.request.json();
	const { testRunId, regenerate: regenerateRaw } = body;

	console.log('[AI Summary] Request body:', JSON.stringify(body));
	console.log('[AI Summary] testRunId:', testRunId);
	console.log('[AI Summary] regenerate type:', typeof regenerateRaw);
	console.log('[AI Summary] regenerate value:', regenerateRaw);

	// Ensure regenerate is a boolean (false by default)
	const regenerate = regenerateRaw === true;
	console.log('[AI Summary] regenerate (normalized):', regenerate);

	if (!testRunId) {
		throw error(400, { message: 'testRunId is required' });
	}

	// Get test run with results
	const testRun = await db.testRun.findUnique({
		where: { id: testRunId },
		include: {
			project: {
				include: {
					team: true
				}
			},
			results: {
				include: {
					testCase: {
						include: {
							suite: {
								select: {
									id: true,
									name: true
								}
							}
						}
					}
				},
				orderBy: {
					executedAt: 'desc'
				}
			}
		}
	});

	if (!testRun) {
		throw error(404, { message: 'Test run not found' });
	}

	// Verify access
	const hasAccess =
		testRun.project.createdBy === userId ||
		(testRun.project.teamId && user?.teamId === testRun.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this test run' });
	}

	// Calculate stats
	const stats = {
		total: testRun.results.length,
		passed: testRun.results.filter((r) => r.status === 'PASSED').length,
		failed: testRun.results.filter((r) => r.status === 'FAILED').length,
		blocked: testRun.results.filter((r) => r.status === 'BLOCKED').length,
		skipped: testRun.results.filter((r) => r.status === 'SKIPPED').length
	};

	// Get failed tests for analysis
	const failedTests = testRun.results
		.filter((r) => r.status === 'FAILED')
		.map((r) => ({
			title: r.testCase.title,
			errorMessage: r.errorMessage || undefined,
			testType: r.testCase.type,
			priority: r.testCase.priority
		}));

	try {
		console.log(`[AI Summary] Checking cache for test run: ${testRunId}`);
		console.log(`[AI Summary] Has cached summary: ${!!testRun.aiSummary}`);
		console.log(`[AI Summary] Regenerate requested: ${regenerate}`);

		// If we have a cached summary and regeneration is not requested, return it
		if (testRun.aiSummary && !regenerate) {
			console.log(`[AI Summary] Returning cached summary for test run: ${testRunId}`);
			return json(
				{
					summary: testRun.aiSummary,
					patternAnalysis: testRun.aiPatternAnalysis,
					generatedAt: testRun.aiSummaryGeneratedAt,
					stats,
					cached: true
				},
				{
					headers: {
						'Cache-Control': 'no-cache'
					}
				}
			);
		}

		console.log(
			`[AI Summary] ${regenerate ? 'Regenerating' : 'Generating'} summary for test run: ${testRunId}`
		);

		const summaryPromise = summarizeTestRun({
			testRunName: testRun.name,
			totalTests: stats.total,
			passed: stats.passed,
			failed: stats.failed,
			blocked: stats.blocked,
			skipped: stats.skipped,
			failedTests
		}).then((summary) => {
			console.log(`[AI Summary] Generated summary (${summary?.length || 0} chars)`);
			return summary;
		});

		// Pattern analysis is extra context. A failure here must not discard a summary
		// that already succeeded (for example when the model returns finish_reason "length").
		let patternPromise: Promise<string | null> = Promise.resolve(null);
		if (stats.failed >= 3) {
			console.log(`[AI Summary] Analyzing patterns for ${stats.failed} failures`);
			patternPromise = analyzeFailurePatterns({
				failures: testRun.results
					.filter((r) => r.status === 'FAILED')
					.map((r) => ({
						testCaseTitle: r.testCase.title,
						errorMessage: r.errorMessage || undefined,
						testType: r.testCase.type,
						suiteName: r.testCase.suite?.name
					}))
			})
				.then((analysis) => {
					console.log(
						`[AI Summary] Pattern analysis complete (${analysis?.length || 0} chars)`
					);
					return analysis;
				})
				.catch((patternError) => {
					console.error('[AI Summary] Pattern analysis failed:', patternError);
					return null;
				});
		}

		const [summary, patternAnalysis] = await Promise.all([summaryPromise, patternPromise]);

		if (!summary) {
			throw new Error('OpenAI returned empty summary');
		}

		// Save the summary to the database
		const now = new Date();
		await db.testRun.update({
			where: { id: testRunId },
			data: {
				aiSummary: summary,
				aiPatternAnalysis: patternAnalysis,
				aiSummaryGeneratedAt: now
			}
		});

		console.log(`[AI Summary] Saved summary to database`);

		return json(
			{
				summary,
				patternAnalysis,
				generatedAt: now,
				stats,
				cached: false
			},
			{
				headers: {
					'Cache-Control': 'no-cache'
				}
			}
		);
	} catch (err) {
		console.error('[AI Summary] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI summary';
		throw error(500, { message: errorMessage });
	}
};
