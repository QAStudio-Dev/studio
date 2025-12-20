import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { generatePageMetaTags } from '$lib/utils/meta-tags';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	return {
		pageMetaTags: generatePageMetaTags(
			'Dashboard',
			'Your personalized test management dashboard. Monitor project health, track test execution metrics, view recent activity, and analyze quality trends across all your projects.'
		)
	};
};
