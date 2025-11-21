import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { analyzeTrace } from '$lib/server/trace-analyzer';
import { checkAIAnalysisQuota, incrementAIAnalysisUsage } from '$lib/server/ai-quota';

/**
 * POST /api/test-results/{id}/analyze-trace
 *
 * Analyze a test failure trace using AI to provide root cause analysis and fix suggestions.
 *
 * Requirements:
 * - Test result must exist and have a trace.zip attachment
 * - User must have access to the project
 * - Team must not exceed AI analysis quota (10 free, unlimited pro)
 *
 * Response includes:
 * - Root cause analysis
 * - Category (STALE_LOCATOR, TIMING_ISSUE, etc.)
 * - Suggested fix with optional code snippet
 * - Confidence score (0-1)
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const testResultId = event.params.id;

	try {
		// Fetch test result with all necessary relationships
		const testResult = await db.testResult.findUnique({
			where: { id: testResultId },
			include: {
				testCase: {
					include: {
						project: {
							include: {
								team: {
									include: {
										subscription: true
									}
								}
							}
						}
					}
				},
				attachments: {
					where: {
						mimeType: 'application/zip',
						originalName: { contains: 'trace' }
					}
				},
				steps: {
					orderBy: { stepNumber: 'asc' },
					include: {
						childSteps: true
					}
				},
				analysis: true // Check if already analyzed
			}
		});

		if (!testResult) {
			return json({ error: 'Test result not found' }, { status: 404 });
		}

		// Check access - get user's team
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		});

		const team = testResult.testCase.project.team;
		if (
			!team ||
			(team.id !== user?.teamId && testResult.testCase.project.createdBy !== userId)
		) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Check if already analyzed
		if (testResult.analysis) {
			return json({
				analysis: {
					id: testResult.analysis.id,
					rootCause: testResult.analysis.rootCause,
					category: testResult.analysis.category,
					suggestedFix: testResult.analysis.suggestedFix,
					fixCode: testResult.analysis.fixCode,
					confidence: testResult.analysis.confidence,
					additionalNotes: testResult.analysis.additionalNotes,
					analyzedAt: testResult.analysis.analyzedAt
				},
				cached: true
			});
		}

		// Check for trace attachment
		const traceAttachment = testResult.attachments[0];
		if (!traceAttachment) {
			return json(
				{
					error: 'No trace file found for this test result. Traces must be uploaded as attachments.'
				},
				{ status: 404 }
			);
		}

		// Check AI analysis quota
		const subscription = team.subscription;
		const quotaCheck = await checkAIAnalysisQuota(team.id, subscription);

		if (!quotaCheck.allowed) {
			return json(
				{
					error: 'AI analysis quota exceeded',
					message: quotaCheck.message,
					limit: quotaCheck.limit,
					used: quotaCheck.used
				},
				{ status: 429 }
			);
		}

		// Download trace.zip from blob storage
		const traceResponse = await fetch(traceAttachment.url);
		if (!traceResponse.ok) {
			return json({ error: 'Failed to download trace file' }, { status: 500 });
		}

		const traceBuffer = Buffer.from(await traceResponse.arrayBuffer());

		// Analyze the trace using AI
		const analysis = await analyzeTrace(traceBuffer, {
			...testResult,
			testStepResults: testResult.steps
		});

		// Save analysis to database
		const savedAnalysis = await db.testResultAnalysis.create({
			data: {
				testResultId,
				analysisType: 'AI_TRACE_ANALYSIS',
				rootCause: analysis.rootCause,
				category: analysis.category,
				suggestedFix: analysis.suggestedFix,
				fixCode: analysis.fixCode,
				confidence: analysis.confidence,
				additionalNotes: analysis.additionalNotes,
				analyzedBy: 'ai'
			}
		});

		// Increment usage counter
		await incrementAIAnalysisUsage(team.id, subscription);

		return json({
			analysis: {
				id: savedAnalysis.id,
				rootCause: savedAnalysis.rootCause,
				category: savedAnalysis.category,
				suggestedFix: savedAnalysis.suggestedFix,
				fixCode: savedAnalysis.fixCode,
				confidence: savedAnalysis.confidence,
				additionalNotes: savedAnalysis.additionalNotes,
				analyzedAt: savedAnalysis.analyzedAt
			},
			cached: false,
			quotaRemaining: quotaCheck.limit - quotaCheck.used - 1
		});
	} catch (error: any) {
		console.error('Trace analysis error:', error);

		// Handle specific error types
		if (error.message?.includes('Invalid trace file')) {
			return json({ error: 'Invalid or corrupted trace file' }, { status: 400 });
		}

		if (error.message?.includes('AI analysis failed')) {
			return json(
				{ error: 'AI analysis service temporarily unavailable. Please try again later.' },
				{ status: 503 }
			);
		}

		return json({ error: 'Failed to analyze trace', details: error.message }, { status: 500 });
	}
};
