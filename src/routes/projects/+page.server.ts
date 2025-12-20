import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generatePageMetaTags } from '$lib/utils/meta-tags';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	// Get current user with team info
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true
				}
			}
		}
	});

	if (!user) {
		throw redirect(302, '/login');
	}

	// Get projects the user has access to
	// - Projects created by the user
	// - Projects belonging to the user's team (if they have one)
	const projects = await db.project.findMany({
		where: {
			OR: [{ createdBy: userId }, ...(user.teamId ? [{ teamId: user.teamId }] : [])]
		},
		include: {
			creator: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true
				}
			},
			team: true,
			_count: {
				select: {
					testCases: true,
					testRuns: true,
					testSuites: true
				}
			}
		},
		orderBy: {
			updatedAt: 'desc'
		}
	});

	return {
		user,
		projects,
		pageMetaTags: generatePageMetaTags(
			'Projects',
			'Browse and manage all your test management projects. View project statistics, test case counts, test run summaries, and team collaboration details.'
		)
	};
};
