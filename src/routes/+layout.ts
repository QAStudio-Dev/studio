import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';

export const load: LayoutLoad = async ({ data, fetch }) => {
	// On client, fetch user data if we don't have it (for prerendered pages)
	if (browser && !data.user) {
		try {
			const response = await fetch('/api/user/me');
			if (response.ok) {
				const userData = await response.json();
				data = {
					...data,
					userId: userData.userId,
					user: userData.user,
					projects: userData.projects
				};
			}
		} catch (e) {
			// Silently fail - user not authenticated
		}
	}

	// Base meta tags are defined server-side in +layout.server.ts for proper SSR
	// Just pass through the data from the server
	return data;
};
