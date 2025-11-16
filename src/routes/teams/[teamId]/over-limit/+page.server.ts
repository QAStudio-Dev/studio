import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	const userId = await requireAuth(event);
	const { teamId } = event.params;

	// Get team with members and subscription
	const team = await db.team.findUnique({
		where: { id: teamId },
		include: {
			members: {
				orderBy: { createdAt: 'asc' }
			},
			subscription: true
		}
	});

	if (!team) {
		throw error(404, 'Team not found');
	}

	// Verify user is a member
	const currentMember = team.members.find((m) => m.id === userId);
	if (!currentMember) {
		throw error(403, 'You are not a member of this team');
	}

	// Only admins/managers can resolve seat limits
	if (currentMember.role !== 'ADMIN' && currentMember.role !== 'MANAGER') {
		throw error(403, 'Only team admins and managers can manage members');
	}

	// If not over limit, redirect to team page
	if (!team.overSeatLimit) {
		throw redirect(302, `/teams/${teamId}`);
	}

	if (!team.subscription) {
		throw error(400, 'Team has no subscription');
	}

	const seatsNeeded = team.subscription.seats;
	const currentMembers = team.members.length;
	const membersToRemove = currentMembers - seatsNeeded;

	return {
		team,
		subscription: team.subscription,
		members: team.members,
		currentUserId: userId,
		seatsNeeded,
		currentMembers,
		membersToRemove
	};
};
