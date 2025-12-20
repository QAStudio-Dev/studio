import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	// Generic meta tags - specific project info is loaded client-side
	return {
		pageMetaTags: {
			title: 'Test Runs',
			description:
				'View and manage test runs for your project. Track test execution progress, analyze results, and monitor quality metrics.'
		}
	};
};
