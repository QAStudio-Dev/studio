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
	const { testResultId } = await event.request.json();

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

	if (!hasActiveSubscription) {
		throw error(403, {
			message: 'AI features require a Pro subscription. Upgrade to access AI-powered insights.'
		});
	}

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
		// Generate AI diagnosis
		const diagnosis = await diagnoseFailedTest({
			testCaseTitle: testResult.testCase.title,
			testCaseDescription: testResult.testCase.description || undefined,
			errorMessage: testResult.errorMessage || undefined,
			stackTrace: testResult.stackTrace || undefined,
			testType: testResult.testCase.type,
			priority: testResult.testCase.priority
		});

		return json({ diagnosis });
	} catch (err) {
		console.error('AI diagnosis error:', err);
		throw error(500, { message: 'Failed to generate AI diagnosis' });
	}
};
