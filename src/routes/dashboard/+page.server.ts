import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadDashboardData } from '$lib/server/dashboard';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	const dashboard = await loadDashboardData(userId);

	if (!dashboard) {
		throw redirect(302, '/login');
	}

	return {
		...dashboard,
		pageMetaTags: {
			title: 'Dashboard',
			description:
				'Your personalized test management dashboard. Monitor project health, track test execution metrics, view recent activity, and analyze quality trends across all your projects.'
		}
	};
};
