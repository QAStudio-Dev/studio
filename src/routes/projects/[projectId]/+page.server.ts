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
			},
			testSuites: {
				where: {
					parentId: null // Only get root level suites
				},
				include: {
					children: {
						include: {
							testCases: {
								orderBy: {
									order: 'asc'
								}
							},
							children: true
						},
						orderBy: {
							order: 'asc'
						}
					},
					testCases: {
						orderBy: {
							order: 'asc'
						}
					}
				},
				orderBy: {
					order: 'asc'
				}
			},
			testCases: {
				where: {
					suiteId: null // Cases without a suite
				},
				orderBy: {
					order: 'asc'
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
	const stats = {
		totalTestCases: await db.testCase.count({
			where: { projectId: project.id }
		}),
		totalTestRuns: await db.testRun.count({
			where: { projectId: project.id }
		}),
		totalSuites: await db.testSuite.count({
			where: { projectId: project.id }
		})
	};

	return {
		project,
		stats,
		currentUser: user
	};
};
