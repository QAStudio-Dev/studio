import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
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
	const userId = await requireAuth(event);
	const { testRunId } = await event.request.json();

	if (!testRunId) {
		throw error(400, { message: 'testRunId is required' });
	}

	// Get user with subscription info
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true
				}
			}
		}
	});

	// Check if user has active subscription
	const hasActiveSubscription =
		user?.team?.subscription?.status === 'ACTIVE' ||
		user?.team?.subscription?.status === 'PAST_DUE';

	if (!hasActiveSubscription) {
		throw error(403, {
			message: 'AI features require a Pro subscription. Upgrade to access AI-powered insights.'
		});
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
			testResults: {
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
		total: testRun.testResults.length,
		passed: testRun.testResults.filter((r) => r.status === 'PASSED').length,
		failed: testRun.testResults.filter((r) => r.status === 'FAILED').length,
		blocked: testRun.testResults.filter((r) => r.status === 'BLOCKED').length,
		skipped: testRun.testResults.filter((r) => r.status === 'SKIPPED').length
	};

	// Get failed tests for analysis
	const failedTests = testRun.testResults
		.filter((r) => r.status === 'FAILED')
		.map((r) => ({
			title: r.testCase.title,
			errorMessage: r.errorMessage || undefined,
			testType: r.testCase.type,
			priority: r.testCase.priority
		}));

	try {
		console.log(`[AI Summary] Starting summary for test run: ${testRunId}`);

		// Generate summary
		const summary = await summarizeTestRun({
			testRunName: testRun.name,
			totalTests: stats.total,
			passed: stats.passed,
			failed: stats.failed,
			blocked: stats.blocked,
			skipped: stats.skipped,
			failedTests
		});

		console.log(`[AI Summary] Generated summary (${summary?.length || 0} chars)`);

		// If there are multiple failures, analyze patterns
		let patternAnalysis: string | null = null;
		if (stats.failed >= 3) {
			console.log(`[AI Summary] Analyzing patterns for ${stats.failed} failures`);

			const failuresForPattern = testRun.testResults
				.filter((r) => r.status === 'FAILED')
				.map((r) => ({
					testCaseTitle: r.testCase.title,
					errorMessage: r.errorMessage || undefined,
					testType: r.testCase.type,
					suiteName: r.testCase.suite?.name
				}));

			patternAnalysis = await analyzeFailurePatterns({
				failures: failuresForPattern
			});

			console.log(`[AI Summary] Pattern analysis complete (${patternAnalysis?.length || 0} chars)`);
		}

		if (!summary) {
			throw new Error('OpenAI returned empty summary');
		}

		return json({
			summary,
			patternAnalysis,
			stats
		}, {
			headers: {
				'Cache-Control': 'no-cache'
			}
		});
	} catch (err) {
		console.error('[AI Summary] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI summary';
		throw error(500, { message: errorMessage });
	}
};
