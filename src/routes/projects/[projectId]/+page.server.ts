import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/sign-in');
	}

	const project = await db.project.findUnique({
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
	});

	if (!project) {
		throw error(404, {
			message: 'Project not found'
		});
	}

	// Check if user has access to this project
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: true
		}
	});

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

	// Get stats
	const totalTestRuns = await db.testRun.count({
		where: { projectId: project.id }
	});

	// Calculate pass rate based on completed runs
	const completedRuns = await db.testRun.findMany({
		where: {
			projectId: project.id,
			status: 'COMPLETED'
		},
		include: {
			_count: {
				select: {
					results: true
				}
			}
		}
	});

	let totalResults = 0;
	let passedResults = 0;

	for (const run of completedRuns) {
		const runPassedCount = await db.testResult.count({
			where: {
				testRunId: run.id,
				status: 'PASSED'
			}
		});
		totalResults += run._count.results;
		passedResults += runPassedCount;
	}

	const stats = {
		totalTestCases: await db.testCase.count({
			where: { projectId: project.id }
		}),
		totalTestRuns,
		passedResults,
		totalResults,
		totalSuites: await db.testSuite.count({
			where: { projectId: project.id }
		})
	};

	// Get recent test runs
	const recentRuns = await db.testRun.findMany({
		where: { projectId: project.id },
		include: {
			environment: true,
			milestone: true,
			_count: {
				select: {
					results: true
				}
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 5
	});

	// Calculate passed/failed counts for each run
	const recentRunsWithCounts = await Promise.all(
		recentRuns.map(async (run) => {
			const passedResults = await db.testResult.count({
				where: {
					testRunId: run.id,
					status: 'PASSED'
				}
			});

			const failedResults = await db.testResult.count({
				where: {
					testRunId: run.id,
					status: 'FAILED'
				}
			});

			return {
				...run,
				_count: {
					...run._count,
					totalResults: run._count.results,
					passedResults,
					failedResults
				}
			};
		})
	);

	return {
		project,
		stats,
		recentRuns: recentRunsWithCounts,
		currentUser: user
	};
};
