// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getUser } from '$lib/server/users';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Get user ID from auth
	const userId = locals.userId || null;

	// Fetch user data if authenticated
	let user = null;
	if (userId) {
		const dbUser = await getUser(userId);
		if (dbUser) {
			user = {
				id: dbUser.id,
				email: dbUser.email,
				firstName: dbUser.firstName,
				lastName: dbUser.lastName,
				imageUrl: dbUser.imageUrl,
				role: dbUser.role,
				teamId: dbUser.teamId
			};
		}
	}

	return {
		userId,
		user
	};
};
