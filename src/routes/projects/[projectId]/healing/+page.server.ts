import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import type { AnalysisCategory } from '$prisma/client';

export const load: PageServerLoad = async (event) => {
	const userId = await requireAuth(event);
	const projectId = event.params.projectId;

	// Verify user has access to this project
	const project = await db.project.findUnique({
		where: { id: projectId },
		include: {
			team: true
		}
	});

	if (!project) {
		return { status: 404, error: 'Project not found' };
	}

	// Get user's team
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	if (!user || (project.createdBy !== userId && project.team?.id !== user.teamId)) {
		return { status: 403, error: 'Access denied' };
	}

	// Get all analyses for this project
	const analyses = await db.testResultAnalysis.findMany({
		where: {
			testResult: {
				testCase: {
					projectId
				}
			}
		},
		include: {
			testResult: {
				include: {
					testCase: {
						select: {
							id: true,
							title: true
						}
					},
					testRun: {
						select: {
							id: true,
							name: true
						}
					}
				}
			}
		},
		orderBy: {
			analyzedAt: 'desc'
		}
	});

	// Calculate statistics
	const totalAnalyzed = analyses.length;

	// Category breakdown
	const categoryBreakdown: Record<AnalysisCategory, number> = {
		STALE_LOCATOR: 0,
		TIMING_ISSUE: 0,
		NETWORK_ERROR: 0,
		ASSERTION_FAILURE: 0,
		DATA_ISSUE: 0,
		ENVIRONMENT_ISSUE: 0,
		CONFIGURATION_ERROR: 0,
		OTHER: 0
	};

	analyses.forEach((analysis) => {
		categoryBreakdown[analysis.category]++;
	});

	// Average confidence
	const avgConfidence =
		analyses.length > 0
			? analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
			: 0;

	// Most problematic tests (tests with most failures analyzed)
	const testFailureCounts = new Map<string, { count: number; testCase: any; analyses: any[] }>();

	analyses.forEach((analysis) => {
		const testCaseId = analysis.testResult.testCase.id;
		const existing = testFailureCounts.get(testCaseId);

		if (existing) {
			existing.count++;
			existing.analyses.push(analysis);
		} else {
			testFailureCounts.set(testCaseId, {
				count: 1,
				testCase: analysis.testResult.testCase,
				analyses: [analysis]
			});
		}
	});

	const mostProblematicTests = Array.from(testFailureCounts.values())
		.sort((a, b) => b.count - a.count)
		.slice(0, 10)
		.map((item) => ({
			testCase: item.testCase,
			failureCount: item.count,
			categories: item.analyses.map((a) => a.category),
			avgConfidence:
				item.analyses.reduce((sum, a) => sum + a.confidence, 0) / item.analyses.length
		}));

	// Fixes applied count
	const fixesApplied = analyses.filter((a) => a.wasFixed).length;

	// Recent analyses (last 10)
	const recentAnalyses = analyses.slice(0, 10).map((analysis) => ({
		id: analysis.id,
		testCase: analysis.testResult.testCase,
		testRun: analysis.testResult.testRun,
		category: analysis.category,
		confidence: analysis.confidence,
		rootCause: analysis.rootCause,
		analyzedAt: analysis.analyzedAt,
		wasFixed: analysis.wasFixed
	}));

	return {
		project,
		stats: {
			totalAnalyzed,
			categoryBreakdown,
			avgConfidence,
			mostProblematicTests,
			fixesApplied,
			recentAnalyses
		}
	};
};
