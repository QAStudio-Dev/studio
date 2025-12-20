import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { sanitizeForMeta } from '$lib/utils/sanitize-meta';
import { hasProjectAccess } from '$lib/server/access-control';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	// Execute auth checks in parallel
	// Note: Parallel execution provides better performance but has a theoretical race condition
	// if user permissions change between queries. This is acceptable for this use case as:
	// 1. Permission changes are rare
	// 2. The authorization check (lines 51-59) validates access based on fetched data
	// 3. The risk window is milliseconds
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

	// Check access: user must be creator or team member
	if (!hasProjectAccess(project, user)) {
		throw error(403, {
			message: 'You do not have access to this project'
		});
	}

	// Fetch test data and stats in parallel with optimized queries
	const [testSuites, allTestCases, totalTestRuns] = await Promise.all([
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
		// Only count test runs (we derive the other counts from fetched data)
		db.testRun.count({ where: { projectId: project.id } })
	]);

	// Separate test cases by suite assignment in a single pass
	// Note: Order is preserved - test cases are already sorted by 'order' ASC,
	// and Map insertion maintains order, so each suite's cases remain sorted
	const testCasesBySuite = new Map<string, typeof allTestCases>();
	const testCasesWithoutSuite: typeof allTestCases = [];

	for (const testCase of allTestCases) {
		if (testCase.suiteId) {
			// Group cases that belong to a suite
			if (!testCasesBySuite.has(testCase.suiteId)) {
				testCasesBySuite.set(testCase.suiteId, []);
			}
			// Safe to use non-null assertion: we just ensured the array exists
			const cases = testCasesBySuite.get(testCase.suiteId);
			if (cases) {
				cases.push(testCase);
			}
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

	// Derive counts from fetched data to avoid redundant queries
	const stats = {
		totalTestCases: allTestCases.length,
		totalTestRuns,
		totalSuites: testSuites.length
	};

	return {
		project: {
			...project,
			testSuites: testSuitesWithCases,
			testCases: testCasesWithoutSuite
		},
		stats,
		currentUser: user,
		pageMetaTags: {
			title: `Test Cases - ${sanitizeForMeta(project.name)}`,
			description: `Manage test cases for ${sanitizeForMeta(project.name)} (${sanitizeForMeta(project.key)}). Define steps, set priorities, and track coverage.`
		}
	};
};
