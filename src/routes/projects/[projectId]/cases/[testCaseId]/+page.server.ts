import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { hasProjectAccess } from '$lib/server/access-control';
import { testResultStepsSelect } from '$lib/server/test-result-steps-select';
import { sanitizeForMeta } from '$lib/utils/sanitize-meta';
import type { PageMetaTags } from '$lib/types/meta';

const resultListSelect = {
	id: true,
	status: true,
	executedAt: true,
	duration: true,
	comment: true,
	errorMessage: true,
	stackTrace: true,
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
		orderBy: { createdAt: 'asc' as const }
	},
	steps: testResultStepsSelect
} as const;

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.userId;

	if (!userId) {
		throw redirect(302, '/login');
	}

	const [testCase, user] = await Promise.all([
		db.testCase.findUnique({
			where: { id: params.testCaseId },
			select: {
				id: true,
				title: true,
				description: true,
				preconditions: true,
				steps: true,
				expectedResult: true,
				priority: true,
				type: true,
				automationStatus: true,
				tags: true,
				createdBy: true,
				createdAt: true,
				updatedAt: true,
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
						teamId: true,
						createdBy: true
					}
				},
				suite: {
					select: {
						id: true,
						name: true
					}
				},
				results: {
					select: resultListSelect,
					orderBy: { executedAt: 'desc' },
					take: 10
				}
			}
		}),
		db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		})
	]);

	if (!testCase) {
		throw error(404, { message: 'Test case not found' });
	}

	if (!user) {
		throw error(401, { message: 'User not found' });
	}

	if (!hasProjectAccess(testCase.project, { id: userId, teamId: user.teamId })) {
		throw error(403, { message: 'Access denied' });
	}

	const pageMetaTags: PageMetaTags = {
		title: `${sanitizeForMeta(testCase.title)} - Test Case`,
		description:
			sanitizeForMeta(testCase.description) ||
			`Test case ${sanitizeForMeta(testCase.title)} in ${sanitizeForMeta(testCase.project.name)}. View steps, history, and results.`
	};

	return {
		testCase,
		pageMetaTags
	};
};
