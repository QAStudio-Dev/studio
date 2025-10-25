import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw error(401, {
			message: 'Unauthorized'
		});
	}

	const team = await db.team.findUnique({
		where: { id: params.teamId },
		include: {
			members: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					imageUrl: true,
					role: true,
					createdAt: true
				},
				orderBy: {
					role: 'asc'
				}
			},
			subscription: true,
			projects: {
				select: {
					id: true,
					name: true,
					key: true,
					createdAt: true
				},
				orderBy: {
					createdAt: 'desc'
				},
				take: 5
			}
		}
	});

	if (!team) {
		throw error(404, {
			message: 'Team not found'
		});
	}

	// Check if user is a member
	const isMember = team.members.some((member) => member.id === userId);
	if (!isMember) {
		throw error(403, {
			message: 'You are not a member of this team'
		});
	}

	// Get current user's info
	const currentUser = team.members.find((member) => member.id === userId);

	return {
		team,
		currentUser
	};
};
