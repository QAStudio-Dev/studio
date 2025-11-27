import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// Get CSRF token from cookie (middleware ensures it exists)
	const csrfToken = cookies.get('qa_studio_csrf');

	return {
		csrfToken: csrfToken || null
	};
};
