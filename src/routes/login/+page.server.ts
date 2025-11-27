import type { PageServerLoad } from './$types';
import { getCsrfToken } from '$lib/server/sessions';

export const load: PageServerLoad = async (event) => {
	// Get CSRF token using proper session API (middleware ensures it exists)
	const csrfToken = getCsrfToken(event);

	return {
		csrfToken
	};
};
