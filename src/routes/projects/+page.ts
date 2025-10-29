import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	// Redirect to dashboard
	throw redirect(302, '/dashboard');
};
