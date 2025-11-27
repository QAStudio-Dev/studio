import type { PageServerLoad } from './$types';
import { getCsrfToken } from '$lib/server/sessions';

export const load: PageServerLoad = async ({ cookies }) => {
	// Get CSRF token from cookie (middleware ensures it exists)
	const csrfToken = cookies.get('qa_studio_csrf');

	return {
		csrfToken: csrfToken || null
	};
};
