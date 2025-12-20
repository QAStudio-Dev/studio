import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	return {
		pageMetaTags: {
			title: 'Dashboard | QA Studio',
			description:
				'View your test management dashboard with project statistics and recent activity'
		}
	};
};
