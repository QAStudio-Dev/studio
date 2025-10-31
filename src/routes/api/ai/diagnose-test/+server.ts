import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { diagnoseFailedTest } from '$lib/server/openai';

/**
 * Generate AI diagnosis for a failed test
 * POST /api/ai/diagnose-test
 *
 * Requires Pro subscription
 *
 * Body:
 * - testResultId: string
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { testResultId, regenerate } = await event.request.json();

	if (!testResultId) {
		throw error(400, { message: 'testResultId is required' });
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

	// if (!hasActiveSubscription) {
	// 	throw error(403, {
	// 		message: 'AI features require a Pro subscription. Upgrade to access AI-powered insights.'
	// 	});
	// }

	// Get test result with details
	const testResult = await db.testResult.findUnique({
		where: { id: testResultId },
		include: {
			testCase: {
				include: {
					project: {
						include: {
							team: true
						}
					}
				}
			},
			testRun: true
		}
	});

	if (!testResult) {
		throw error(404, { message: 'Test result not found' });
	}

	// Verify access
	const hasAccess =
		testResult.testCase.project.createdBy === userId ||
		(testResult.testCase.project.teamId && user?.teamId === testResult.testCase.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this test result' });
	}

	// Only diagnose failed tests
	if (testResult.status !== 'FAILED') {
		throw error(400, { message: 'AI diagnosis is only available for failed tests' });
	}

	try {
		console.log(`[AI Diagnosis] Checking cache for test result: ${testResultId}`);
		console.log(`[AI Diagnosis] Has cached diagnosis: ${!!testResult.aiDiagnosis}`);
		console.log(`[AI Diagnosis] Regenerate requested: ${regenerate}`);

		// If we have a cached diagnosis and regeneration is not requested, return it
		if (testResult.aiDiagnosis && !regenerate) {
			console.log(`[AI Diagnosis] Returning cached diagnosis for test result: ${testResultId}`);
			return json({
				diagnosis: testResult.aiDiagnosis,
				generatedAt: testResult.aiDiagnosisGeneratedAt,
				cached: true
			}, {
				headers: {
					'Cache-Control': 'no-cache'
				}
			});
		}

		console.log(`[AI Diagnosis] ${regenerate ? 'Regenerating' : 'Generating'} diagnosis for test result: ${testResultId}`);

		// Generate AI diagnosis
		const diagnosis = await diagnoseFailedTest({
			testCaseTitle: testResult.testCase.title,
			testCaseDescription: testResult.testCase.description || undefined,
			errorMessage: testResult.errorMessage || undefined,
			stackTrace: testResult.stackTrace || undefined,
			testType: testResult.testCase.type,
			priority: testResult.testCase.priority
		});

		console.log(`[AI Diagnosis] Successfully generated diagnosis for test result: ${testResultId}`);
		console.log(`[AI Diagnosis] Diagnosis length: ${diagnosis?.length || 0} characters`);

		if (!diagnosis) {
			throw new Error('OpenAI returned empty diagnosis');
		}

		// Save the diagnosis to the database
		const now = new Date();
		await db.testResult.update({
			where: { id: testResultId },
			data: {
				aiDiagnosis: diagnosis,
				aiDiagnosisGeneratedAt: now
			}
		});

		console.log(`[AI Diagnosis] Saved diagnosis to database`);

		return json({
			diagnosis,
			generatedAt: now,
			cached: false
		}, {
			headers: {
				'Cache-Control': 'no-cache'
			}
		});
	} catch (err) {
		console.error('[AI Diagnosis] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI diagnosis';
		throw error(500, { message: errorMessage });
	}
};
