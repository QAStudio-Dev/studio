import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { requireRole } from '$lib/server/auth';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { teamId } = event.params;

	// Require OWNER, ADMIN, or MANAGER role
	const user = await requireRole(event, ['OWNER', 'ADMIN', 'MANAGER']);

	// Verify user is in this team
	if (user.teamId !== teamId) {
		throw error(403, {
			message: 'You can only invite members to your own team'
		});
	}

	// Load team with subscription and members
	const team = await db.team.findUnique({
		where: { id: teamId },
		include: {
			members: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					role: true
				}
			},
			subscription: true,
			invitations: {
				where: {
					status: 'PENDING'
				},
				orderBy: {
					createdAt: 'desc'
				},
				select: {
					id: true,
					email: true,
					role: true,
					token: true,
					createdAt: true,
					expiresAt: true
				}
			}
		}
	});

	if (!team) {
		throw error(404, {
			message: 'Team not found'
		});
	}

	// Calculate available seats
	const maxSeats = team.subscription?.seats || 1;
	const usedSeats = team.members.length;
	const availableSeats = maxSeats - usedSeats;

	return {
		team,
		availableSeats,
		maxSeats,
		currentUser: user
	};
};
