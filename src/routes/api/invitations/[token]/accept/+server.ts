import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { ensureUser } from '$lib/server/users';
import { deleteCache, CacheKeys } from '$lib/server/redis';

/**
 * Accept an invitation
 * POST /api/invitations/[token]/accept
 */
export const POST: RequestHandler = async (event) => {
	const { token } = event.params;

	// Require authentication
	const userId = await requireAuth(event);
	const user = await ensureUser(userId);

	const invitation = await db.teamInvitation.findUnique({
		where: { token },
		include: {
			team: {
				include: {
					subscription: true,
					members: true
				}
			}
		}
	});

	if (!invitation) {
		throw error(404, {
			message: 'Invitation not found'
		});
	}

	// Verify email matches (case-insensitive)
	if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
		throw error(403, {
			message: 'This invitation was sent to a different email address'
		});
	}

	// Check if invitation is expired
	if (new Date() > invitation.expiresAt) {
		await db.teamInvitation.update({
			where: { id: invitation.id },
			data: { status: 'EXPIRED' }
		});

		throw error(410, {
			message: 'This invitation has expired'
		});
	}

	// Check if invitation is no longer pending
	if (invitation.status !== 'PENDING') {
		throw error(400, {
			message: `This invitation has already been ${invitation.status.toLowerCase()}`
		});
	}

	// Check if user is already in a team
	if (user.teamId) {
		throw error(400, {
			message: 'You are already a member of a team. Please leave your current team first.'
		});
	}

	// Check if team still has available seats
	const subscription = invitation.team.subscription;
	const currentMembers = invitation.team.members.length;

	if (!subscription) {
		// Free tier - only 1 member allowed
		if (currentMembers >= 1) {
			throw error(400, {
				message: 'This team has reached its member limit. Please ask the team admin to upgrade.'
			});
		}
	} else {
		// Pro tier - check seat limit
		if (currentMembers >= subscription.seats) {
			throw error(400, {
				message:
					'This team has reached its seat limit. Please ask the team admin to add more seats.'
			});
		}
	}

	// Add user to team and mark invitation as accepted
	await db.$transaction([
		db.user.update({
			where: { id: userId },
			data: {
				teamId: invitation.teamId,
				role: invitation.role
			}
		}),
		db.teamInvitation.update({
			where: { id: invitation.id },
			data: {
				status: 'ACCEPTED',
				acceptedAt: new Date()
			}
		})
	]);

	// Invalidate user's project cache - they now have access to team projects
	await deleteCache(CacheKeys.projects(userId));

	return json({
		success: true,
		team: {
			id: invitation.teamId,
			name: invitation.team.name
		}
	});
};
