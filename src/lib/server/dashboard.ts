import { db } from '$lib/server/db';
import { hasActiveSubscription } from '$lib/server/subscriptions';
import { getAccessibleProjectsWithCounts } from '$lib/server/projects';

function resultScope(userId: string, teamId: string | null) {
	return teamId
		? {
				testRun: {
					project: { teamId }
				}
			}
		: {
				executedBy: userId,
				testRun: {
					project: { teamId: null }
				}
			};
}

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
					name: true,
					subscription: true
				}
			}
		}
	});

	if (!user) {
		return null;
	}

	const scope = resultScope(userId, user.teamId);
	const projectFilter = user.teamId
		? { project: { teamId: user.teamId } }
		: { createdBy: userId, project: { teamId: null } };

	const [projects, totalTestCases, totalTestRuns, recentResults, passedTests, failedTests] =
		await Promise.all([
			getAccessibleProjectsWithCounts(userId),
			db.testCase.count({ where: projectFilter }),
			db.testRun.count({ where: projectFilter }),
			db.testResult.findMany({
				where: scope,
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
				where: { status: 'PASSED', ...scope }
			}),
			db.testResult.count({
				where: { status: 'FAILED', ...scope }
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
