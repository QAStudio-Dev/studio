// src/routes/+layout.server.ts
import { buildClerkProps } from 'svelte-clerk/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	// Check if Clerk auth is available
	if (!locals.auth || typeof locals.auth !== 'function') {
		return {
			userId: null,
			session: null,
			orgId: null,
			orgRole: null,
			orgSlug: null,
			orgPermissions: null
		};
	}

	return {
		...buildClerkProps(locals.auth())
	};
};