import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { Prisma, type AnalysisCategory } from '$prisma/client';
const CATEGORY_KEYS: AnalysisCategory[] = [
	'STALE_LOCATOR',
	'TIMING_ISSUE',
	'NETWORK_ERROR',
	'ASSERTION_FAILURE',
	'DATA_ISSUE',
	'ENVIRONMENT_ISSUE',
	'CONFIGURATION_ERROR',
	'OTHER'
];

export const load: PageServerLoad = async (event) => {
	const userId = await requireAuth(event);
	const projectId = event.params.projectId;

	const [project, user, aggregate, categoryStats, recentAnalyses, problematicRows] =
		await Promise.all([
			db.project.findUnique({
				where: { id: projectId },
				select: {
					id: true,
					name: true,
					key: true,
					createdBy: true,
					teamId: true
				}
			}),
			db.user.findUnique({
				where: { id: userId },
				select: { teamId: true }
			}),
			db.testResultAnalysis.aggregate({
				where: {
					testResult: {
						testCase: { projectId }
					}
				},
				_count: true,
				_avg: { confidence: true }
			}),
			db.testResultAnalysis.groupBy({
				by: ['category'],
				where: {
					testResult: {
						testCase: { projectId }
					}
				},
				_count: true
			}),
			db.testResultAnalysis.findMany({
				where: {
					testResult: {
						testCase: { projectId }
					}
				},
				select: {
					id: true,
					category: true,
					confidence: true,
					rootCause: true,
					analyzedAt: true,
					wasFixed: true,
					testResult: {
						select: {
							testCase: {
								select: { id: true, title: true }
							},
							testRun: {
								select: { id: true, name: true }
							}
						}
					}
				},
				orderBy: { analyzedAt: 'desc' },
				take: 10
			}),
			db.$queryRaw<
				Array<{
					testCaseId: string;
					title: string;
					failureCount: bigint;
					avgConfidence: number | null;
				}>
			>`
				SELECT
					tc.id AS "testCaseId",
					tc.title,
					COUNT(*)::bigint AS "failureCount",
					AVG(tra.confidence)::float AS "avgConfidence"
				FROM "TestResultAnalysis" tra
				INNER JOIN "TestResult" tr ON tr.id = tra."testResultId"
				INNER JOIN "TestCase" tc ON tc.id = tr."testCaseId"
				WHERE tc."projectId" = ${projectId}
				GROUP BY tc.id, tc.title
				ORDER BY "failureCount" DESC
				LIMIT 10
			`
		]);

	if (!project) {
		return { status: 404, error: 'Project not found' };
	}

	if (!user || (project.createdBy !== userId && project.teamId !== user.teamId)) {
		return { status: 403, error: 'Access denied' };
	}

	const totalAnalyzed = aggregate._count;
	const avgConfidence = aggregate._avg.confidence ?? 0;

	const categoryBreakdown = CATEGORY_KEYS.reduce(
		(acc, key) => {
			acc[key] = 0;
			return acc;
		},
		{} as Record<AnalysisCategory, number>
	);

	for (const row of categoryStats) {
		categoryBreakdown[row.category] = row._count;
	}

	const [fixesApplied, categoryRows] = await Promise.all([
		db.testResultAnalysis.count({
			where: {
				wasFixed: true,
				testResult: {
					testCase: { projectId }
				}
			}
		}),
		problematicRows.length > 0
			? db.$queryRaw<Array<{ testCaseId: string; category: AnalysisCategory }>>`
					SELECT DISTINCT tr."testCaseId", tra.category
					FROM "TestResultAnalysis" tra
					INNER JOIN "TestResult" tr ON tr.id = tra."testResultId"
					WHERE tr."testCaseId" IN (${Prisma.join(problematicRows.map((row) => row.testCaseId))})
				`
			: Promise.resolve([])
	]);

	const categoriesByTestCase = new Map<string, AnalysisCategory[]>();
	for (const row of categoryRows) {
		const existing = categoriesByTestCase.get(row.testCaseId) ?? [];
		if (!existing.includes(row.category)) {
			existing.push(row.category);
		}
		categoriesByTestCase.set(row.testCaseId, existing);
	}

	const mostProblematicTests = problematicRows.map((row) => ({
		testCase: { id: row.testCaseId, title: row.title },
		failureCount: Number(row.failureCount),
		categories: categoriesByTestCase.get(row.testCaseId) ?? [],
		avgConfidence: row.avgConfidence ?? 0
	}));

	return {
		project,
		stats: {
			totalAnalyzed,
			categoryBreakdown,
			avgConfidence,
			mostProblematicTests,
			fixesApplied,
			recentAnalyses: recentAnalyses.map((analysis) => ({
				id: analysis.id,
				testCase: analysis.testResult.testCase,
				testRun: analysis.testResult.testRun,
				category: analysis.category,
				confidence: analysis.confidence,
				rootCause: analysis.rootCause,
				analyzedAt: analysis.analyzedAt,
				wasFixed: analysis.wasFixed
			}))
		}
	};
};
