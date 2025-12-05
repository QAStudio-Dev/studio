// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getUser } from '$lib/server/users';
import { db } from '$lib/server/db';
import { getCsrfToken } from '$lib/server/sessions';

export const load: LayoutServerLoad = async (event) => {
	const { locals } = event;
	// Get user ID from auth
	const userId = locals.userId || null;

	// Generate CSRF token for forms
	const csrfToken = getCsrfToken(event);

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
			// Only fetch projects if user has a team
			if (dbUser.teamId) {
				const userProjects = await db.project.findMany({
					where: {
						teamId: dbUser.teamId
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
	}

	return {
		userId,
		user,
		projects,
		csrfToken
	};
};
