import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.userId;

	if (!userId) {
		throw redirect(303, '/login');
	}

	// Get user to check team membership
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	// Fetch user's projects
	const projects = await db.project.findMany({
		where: {
			OR: [{ createdBy: userId }, { teamId: user?.teamId || undefined }]
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

	return {
		projects
	};
};
