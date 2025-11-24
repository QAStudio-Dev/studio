import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/sign-in');
	}

	// Execute auth checks in parallel
	const [project, user] = await Promise.all([
		db.project.findUnique({
			where: { id: params.projectId },
			include: {
				creator: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true
					}
				},
				team: {
					include: {
						members: true
					}
				}
			}
		}),
		db.user.findUnique({
			where: { id: userId },
			include: {
				team: true
			}
		})
	]);

	if (!project) {
		throw error(404, {
			message: 'Project not found'
		});
	}

	if (!user) {
		throw error(401, { message: 'User not found' });
	}

	// Check access: user must be creator, team member, or project is in their team
	const hasAccess =
		project.createdBy === userId ||
		(project.teamId && user.teamId === project.teamId) ||
		(!project.teamId && project.createdBy === userId);

	if (!hasAccess) {
		throw error(403, {
			message: 'You do not have access to this project'
		});
	}

	// Fetch test data and stats in parallel with optimized queries
	const [testSuites, testCasesWithoutSuite, statsResult] = await Promise.all([
		// Fetch test suites without nested test cases to avoid N+1
		db.testSuite.findMany({
			where: { projectId: project.id },
			orderBy: { order: 'asc' }
		}),
		// Fetch test cases without a suite
		db.testCase.findMany({
			where: {
				projectId: project.id,
				suiteId: null
			},
			orderBy: { order: 'asc' }
		}),
		// Single aggregation query for all stats using scalar subqueries
		db.$queryRaw<
			Array<{
				totalTestCases: bigint;
				totalTestRuns: bigint;
				totalSuites: bigint;
			}>
		>`
			SELECT
				(SELECT COUNT(*) FROM "TestCase" WHERE "projectId" = ${project.id}) as "totalTestCases",
				(SELECT COUNT(*) FROM "TestRun" WHERE "projectId" = ${project.id}) as "totalTestRuns",
				(SELECT COUNT(*) FROM "TestSuite" WHERE "projectId" = ${project.id}) as "totalSuites"
		`
	]);

	// Fetch all test cases for this project in a single query
	const allTestCases = await db.testCase.findMany({
		where: { projectId: project.id },
		orderBy: { order: 'asc' }
	});

	// Group test cases by suiteId for efficient lookup
	const testCasesBySuite = new Map<string, typeof allTestCases>();
	for (const testCase of allTestCases) {
		if (testCase.suiteId) {
			if (!testCasesBySuite.has(testCase.suiteId)) {
				testCasesBySuite.set(testCase.suiteId, []);
			}
			testCasesBySuite.get(testCase.suiteId)!.push(testCase);
		}
	}

	// Attach test cases to their respective suites
	const testSuitesWithCases = testSuites.map((suite) => ({
		...suite,
		testCases: testCasesBySuite.get(suite.id) || []
	}));

	// Convert BigInt to Number for JSON serialization
	const stats = {
		totalTestCases: Number(statsResult[0]?.totalTestCases ?? 0),
		totalTestRuns: Number(statsResult[0]?.totalTestRuns ?? 0),
		totalSuites: Number(statsResult[0]?.totalSuites ?? 0)
	};

	return {
		project: {
			...project,
			testSuites: testSuitesWithCases,
			testCases: testCasesWithoutSuite
		},
		stats,
		currentUser: user
	};
};
