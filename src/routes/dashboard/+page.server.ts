import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/sign-in');
	}

	// Get user with team and subscription info
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true,
					members: true
				}
			}
		}
	});

	if (!user) {
		throw redirect(302, '/sign-in');
	}

	// Get projects (either user's personal projects or team projects)
	const projects = await db.project.findMany({
		where: user.teamId
			? {
					teamId: user.teamId
				}
			: {
					createdBy: userId,
					teamId: null // Personal projects only
				},
		include: {
			testCases: {
				select: { id: true }
			},
			testRuns: {
				select: { id: true, status: true }
			},
			_count: {
				select: {
					testCases: true,
					testRuns: true
				}
			}
		},
		orderBy: {
			updatedAt: 'desc'
		}
	});

	// Get overall stats
	const totalTestCases = await db.testCase.count({
		where: user.teamId
			? {
					project: { teamId: user.teamId }
				}
			: {
					createdBy: userId,
					project: { teamId: null }
				}
	});

	const totalTestRuns = await db.testRun.count({
		where: user.teamId
			? {
					project: { teamId: user.teamId }
				}
			: {
					createdBy: userId,
					project: { teamId: null }
				}
	});

	const recentResults = await db.testResult.findMany({
		where: user.teamId
			? {
					testRun: {
						project: { teamId: user.teamId }
					}
				}
			: {
					executedBy: userId,
					testRun: {
						project: { teamId: null }
					}
				},
		include: {
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
		orderBy: {
			executedAt: 'desc'
		},
		take: 10
	});

	// Calculate pass rate
	const passedTests = await db.testResult.count({
		where: {
			status: 'PASSED',
			...(user.teamId
				? {
						testRun: {
							project: { teamId: user.teamId }
						}
					}
				: {
						executedBy: userId,
						testRun: {
							project: { teamId: null }
						}
					})
		}
	});

	const totalTests = await db.testResult.count({
		where: user.teamId
			? {
					testRun: {
						project: { teamId: user.teamId }
					}
				}
			: {
					executedBy: userId,
					testRun: {
						project: { teamId: null }
					}
				}
	});

	const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

	// Check project limit
	const hasActiveSubscription = user.team?.subscription?.status === 'ACTIVE' ||
	                               user.team?.subscription?.status === 'TRIALING';
	const projectLimit = hasActiveSubscription ? null : 1; // null = unlimited
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
			hasActiveSubscription,
			projectLimit,
			canCreateProject
		}
	};
};
