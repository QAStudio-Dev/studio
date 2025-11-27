// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getUser } from '$lib/server/users';
import { db } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Get user ID from auth
	const userId = locals.userId || null;

	// Fetch user data if authenticated
	let user = null;
	let projects: Array<{ id: string; name: string; key: string }> = [];

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

			// Fetch user's projects
			const userProjects = await db.project.findMany({
				where: {
					teamId: dbUser.teamId || undefined
				},
				select: {
					id: true,
					name: true,
					key: true
				},
				orderBy: {
					createdAt: 'desc'
				}
			});

			projects = userProjects;
		}
	}

	return {
		userId,
		user,
		projects
	};
};
