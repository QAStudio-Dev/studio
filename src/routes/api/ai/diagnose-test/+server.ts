import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requirePremiumFeature } from '$lib/server/auth';
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
	// Require active pro subscription for AI features
	const { userId, user } = await requirePremiumFeature(event, 'AI-powered failure analysis');

	const body = await event.request.json();
	const { testResultId, regenerate: regenerateRaw } = body;

	// Ensure regenerate is a boolean (false by default)
	const regenerate = regenerateRaw === true;

	if (!testResultId) {
		throw error(400, { message: 'testResultId is required' });
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
			testRun: true,
			attachments: true
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
			return json(
				{
					diagnosis: testResult.aiDiagnosis,
					generatedAt: testResult.aiDiagnosisGeneratedAt,
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
			`[AI Diagnosis] ${regenerate ? 'Regenerating' : 'Generating'} diagnosis for test result: ${testResultId}`
		);

		// Check for error-context.md attachment
		let errorContext: string | undefined;
		const errorContextAttachment = testResult.attachments?.find(
			(att) => att.originalName === 'error-context.md' || att.filename.includes('error-context')
		);

		if (errorContextAttachment) {
			try {
				console.log(`[AI Diagnosis] Found error-context attachment, fetching...`);
				// Fetch the content from the URL
				const response = await fetch(errorContextAttachment.url);
				if (response.ok) {
					errorContext = await response.text();
					console.log(`[AI Diagnosis] Error context loaded: ${errorContext.length} chars`);
				}
			} catch (err) {
				console.error('[AI Diagnosis] Failed to fetch error context:', err);
			}
		}

		// Generate AI diagnosis
		const diagnosis = await diagnoseFailedTest({
			testCaseTitle: testResult.testCase.title,
			testCaseDescription: testResult.testCase.description || undefined,
			errorMessage: testResult.errorMessage || undefined,
			stackTrace: testResult.stackTrace || undefined,
			testType: testResult.testCase.type,
			priority: testResult.testCase.priority,
			errorContext
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

		return json(
			{
				diagnosis,
				generatedAt: now,
				cached: false
			},
			{
				headers: {
					'Cache-Control': 'no-cache'
				}
			}
		);
	} catch (err) {
		console.error('[AI Diagnosis] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI diagnosis';
		throw error(500, { message: errorMessage });
	}
};
