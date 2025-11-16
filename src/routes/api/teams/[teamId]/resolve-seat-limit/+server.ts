import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { deleteCache, CacheKeys } from '$lib/server/redis';

/**
 * Remove members to resolve over-seat-limit situation
 * POST /api/teams/:teamId/resolve-seat-limit
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { teamId } = event.params;
	const { memberIdsToRemove } = await event.request.json();

	if (!memberIdsToRemove || !Array.isArray(memberIdsToRemove)) {
		throw error(400, {
			message: 'memberIdsToRemove must be an array of user IDs'
		});
	}

	// Get team with members and subscription
	const team = await db.team.findUnique({
		where: { id: teamId },
		include: {
			members: true,
			subscription: true
		}
	});

	if (!team) {
		throw error(404, {
			message: 'Team not found'
		});
	}

	// Verify user is a member
	const currentMember = team.members.find((m) => m.id === userId);
	if (!currentMember) {
		throw error(403, {
			message: 'You are not a member of this team'
		});
	}

	// Only admins/managers can remove members
	if (currentMember.role !== 'ADMIN' && currentMember.role !== 'MANAGER') {
		throw error(403, {
			message: 'Only team admins and managers can remove members'
		});
	}

	// Verify team is actually over limit
	if (!team.overSeatLimit) {
		throw error(400, {
			message: 'Team is not over seat limit'
		});
	}

	if (!team.subscription) {
		throw error(400, {
			message: 'Team has no subscription'
		});
	}

	// Verify removal count is correct
	const seatsNeeded = team.subscription.seats;
	const currentMembers = team.members.length;
	const membersToRemove = currentMembers - seatsNeeded;

	if (memberIdsToRemove.length !== membersToRemove) {
		throw error(400, {
			message: `You must remove exactly ${membersToRemove} member${membersToRemove !== 1 ? 's' : ''}`
		});
	}

	// Prevent removing yourself
	if (memberIdsToRemove.includes(userId)) {
		throw error(400, {
			message: 'You cannot remove yourself from the team'
		});
	}

	// Verify all user IDs are valid team members
	const invalidIds = memberIdsToRemove.filter((id) => !team.members.some((m) => m.id === id));

	if (invalidIds.length > 0) {
		throw error(400, {
			message: 'Some user IDs are not members of this team'
		});
	}

	// Perform removal and validation inside transaction to prevent race conditions
	const result = await db.$transaction(async (tx) => {
		// Re-fetch team data inside transaction for up-to-date state
		const freshTeam = await tx.team.findUnique({
			where: { id: teamId },
			include: {
				members: true,
				subscription: true
			}
		});

		if (!freshTeam || !freshTeam.subscription) {
			throw error(500, { message: 'Team state changed during operation' });
		}

		// Re-validate with fresh data
		const freshSeatsNeeded = freshTeam.subscription.seats;
		const freshCurrentMembers = freshTeam.members.length;
		const freshMembersToRemove = freshCurrentMembers - freshSeatsNeeded;

		// Verify removal count is still correct with fresh data
		if (memberIdsToRemove.length !== freshMembersToRemove) {
			throw error(400, {
				message: `Team state changed. You must now remove exactly ${freshMembersToRemove} member${freshMembersToRemove !== 1 ? 's' : ''}`
			});
		}

		// Verify all user IDs are still valid team members
		const freshInvalidIds = memberIdsToRemove.filter(
			(id) => !freshTeam.members.some((m) => m.id === id)
		);
		if (freshInvalidIds.length > 0) {
			throw error(400, { message: 'Some user IDs are no longer members of this team' });
		}

		// Remove members from team
		await tx.user.updateMany({
			where: {
				id: { in: memberIdsToRemove }
			},
			data: {
				teamId: null
			}
		});

		// Calculate final state
		const finalRemainingMembers = freshCurrentMembers - memberIdsToRemove.length;
		const isStillOverLimit = finalRemainingMembers > freshSeatsNeeded;

		// Update team's overSeatLimit flag
		await tx.team.update({
			where: { id: teamId },
			data: {
				overSeatLimit: isStillOverLimit
			}
		});

		return {
			removedCount: memberIdsToRemove.length,
			remainingMembers: finalRemainingMembers
		};
	});

	// Invalidate team status cache after successful member removal
	await deleteCache(CacheKeys.teamStatus(teamId));

	return json({
		success: true,
		removedCount: result.removedCount,
		remainingMembers: result.remainingMembers,
		message: `Successfully removed ${result.removedCount} member${result.removedCount !== 1 ? 's' : ''} from the team`
	});
};
