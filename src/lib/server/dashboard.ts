import { db } from '$lib/server/db';
import { hasActiveSubscription } from '$lib/server/subscriptions';
import { getAccessibleProjectsWithCounts } from '$lib/server/projects';

export async function loadDashboardData(userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			imageUrl: true,
			role: true,
			teamId: true,
			team: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	if (!user) {
		return null;
	}

	const projects = await getAccessibleProjectsWithCounts(userId);
	const projectIds = projects.map((p) => p.id);

	const emptyStats = {
		totalProjects: 0,
		totalTestCases: 0,
		totalTestRuns: 0,
		passRate: 0,
		recentResults: [] as Array<{
			id: string;
			status: string;
			executedAt: Date;
			testCase: { title: string };
			testRun: { name: string; project: { name: string; key: string } };
		}>
	};

	if (projectIds.length === 0) {
		const hasSubscription = user.teamId ? await hasActiveSubscription(user.teamId) : false;
		const projectLimit = hasSubscription ? null : 1;
		return {
			user,
			projects,
			stats: emptyStats,
			subscription: {
				hasActiveSubscription: hasSubscription,
				projectLimit,
				canCreateProject: projectLimit === null || projects.length < projectLimit
			}
		};
	}

	const resultScope = { testRun: { projectId: { in: projectIds } } };

	const [totalTestCases, totalTestRuns, recentResults, passedTests, failedTests] =
		await Promise.all([
			db.testCase.count({ where: { projectId: { in: projectIds } } }),
			db.testRun.count({ where: { projectId: { in: projectIds } } }),
			db.testResult.findMany({
				where: resultScope,
				select: {
					id: true,
					status: true,
					executedAt: true,
					testCase: {
						select: { title: true }
					},
					testRun: {
						select: {
							name: true,
							project: {
								select: { name: true, key: true }
							}
						}
					}
				},
				orderBy: { executedAt: 'desc' },
				take: 10
			}),
			db.testResult.count({
				where: { status: 'PASSED', ...resultScope }
			}),
			db.testResult.count({
				where: { status: 'FAILED', ...resultScope }
			})
		]);

	const executedTests = passedTests + failedTests;
	const passRate = executedTests > 0 ? Math.round((passedTests / executedTests) * 100) : 0;

	const hasSubscription = user.teamId ? await hasActiveSubscription(user.teamId) : false;
	const projectLimit = hasSubscription ? null : 1;
	const canCreateProject = projectLimit === null || projects.length < projectLimit;

	return {
		user,
		projects,
		stats: {
			totalProjects: projects.length,
			totalTestCases,
			totalTestRuns,
			passRate,
			recentResults
		},
		subscription: {
			hasActiveSubscription: hasSubscription,
			projectLimit,
			canCreateProject
		}
	};
}
