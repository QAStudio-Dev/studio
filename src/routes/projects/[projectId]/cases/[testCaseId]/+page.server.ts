import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	const testCase = await db.testCase.findUnique({
		where: { id: params.testCaseId },
		include: {
			creator: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					imageUrl: true
				}
			},
			project: {
				select: {
					id: true,
					name: true,
					key: true,
					teamId: true
				}
			},
			suite: {
				select: {
					id: true,
					name: true
				}
			},
			results: {
				include: {
					executor: {
						select: {
							firstName: true,
							lastName: true,
							email: true
						}
					},
					testRun: {
						select: {
							id: true,
							name: true
						}
					},
					attachments: {
						select: {
							id: true,
							filename: true,
							originalName: true,
							mimeType: true,
							size: true,
							url: true,
							createdAt: true
						},
						orderBy: {
							createdAt: 'asc'
						}
					},
					steps: {
						where: { parentStepId: null }, // Only get top-level steps
						orderBy: { stepNumber: 'asc' },
						include: {
							childSteps: {
								orderBy: { stepNumber: 'asc' },
								include: {
									childSteps: {
										orderBy: { stepNumber: 'asc' }
									}
								}
							}
						}
					}
				},
				orderBy: {
					executedAt: 'desc'
				},
				take: 10
			}
		}
	});

	if (!testCase) {
		throw error(404, { message: 'Test case not found' });
	}

	// Check access
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		testCase.createdBy === userId ||
		(testCase.project.teamId && user?.teamId === testCase.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'Access denied' });
	}

	return {
		testCase,
		pageMetaTags: {
			title: `${testCase.title} - Test Case`,
			description:
				testCase.description ||
				`View complete test case details for ${testCase.title} in ${testCase.project.name}. Review test steps, execution history, results, and attachments.`
		}
	};
};
