import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser } from '$lib/server/users';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.userId || null;

	if (!userId) {
		return json({ userId: null, user: null, projects: [] });
	}

	const dbUser = await getUser(userId);
	if (!dbUser) {
		return json({ userId: null, user: null, projects: [] });
	}

	const user = {
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
	const projects = dbUser.teamId
		? await db.project.findMany({
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
			})
		: [];

	return json({
		userId,
		user,
		projects
	});
};
