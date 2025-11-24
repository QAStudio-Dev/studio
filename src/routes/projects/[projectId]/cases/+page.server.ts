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
	const [testSuites, allTestCases, totalTestCases, totalTestRuns, totalSuites] =
		await Promise.all([
			// Fetch test suites without nested test cases to avoid N+1
			db.testSuite.findMany({
				where: { projectId: project.id },
				orderBy: { order: 'asc' }
			}),
			// Fetch ALL test cases in a single query (includes both suite and non-suite cases)
			db.testCase.findMany({
				where: { projectId: project.id },
				orderBy: { order: 'asc' }
			}),
			// Use Prisma's count methods for type safety and simplicity
			db.testCase.count({ where: { projectId: project.id } }),
			db.testRun.count({ where: { projectId: project.id } }),
			db.testSuite.count({ where: { projectId: project.id } })
		]);

	// Separate test cases by suite assignment in a single pass
	const testCasesBySuite = new Map<string, typeof allTestCases>();
	const testCasesWithoutSuite: typeof allTestCases = [];

	for (const testCase of allTestCases) {
		if (testCase.suiteId) {
			// Group cases that belong to a suite
			if (!testCasesBySuite.has(testCase.suiteId)) {
				testCasesBySuite.set(testCase.suiteId, []);
			}
			testCasesBySuite.get(testCase.suiteId)!.push(testCase);
		} else {
			// Collect cases without a suite
			testCasesWithoutSuite.push(testCase);
		}
	}

	// Attach test cases to their respective suites
	const testSuitesWithCases = testSuites.map((suite) => ({
		...suite,
		testCases: testCasesBySuite.get(suite.id) || []
	}));

	// Stats are already numbers from Prisma's count methods
	const stats = {
		totalTestCases,
		totalTestRuns,
		totalSuites
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
