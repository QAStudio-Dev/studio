import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { isSubscriptionCurrent } from '$lib/server/subscriptions';

export const load: PageServerLoad = async (event) => {
	const userId = await requireAuth(event);
	const { teamId } = event.params;

	// Get team with subscription
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

	// If subscription is current, redirect to team page
	if (isSubscriptionCurrent(team.subscription)) {
		throw redirect(302, `/teams/${teamId}`);
	}

	return {
		team,
		subscription: team.subscription,
		currentUser: currentMember,
		isAdmin: currentMember.role === 'ADMIN' || currentMember.role === 'MANAGER'
	};
};
