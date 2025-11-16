import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { deleteCache, CacheKeys } from '$lib/server/redis';

// Simple in-memory rate limiter for this sensitive endpoint
// Key: userId:teamId, Value: timestamp of last request
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute between requests

function checkRateLimit(userId: string, teamId: string): void {
	const key = `${userId}:${teamId}`;
	const now = Date.now();
	const lastRequest = rateLimitMap.get(key);

	if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW_MS) {
		const remainingSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastRequest)) / 1000);
		throw error(429, {
			message: `Too many requests. Please wait ${remainingSeconds} seconds before trying again.`
		});
	}

	rateLimitMap.set(key, now);

	// Clean up old entries (older than 5 minutes)
	if (rateLimitMap.size > 1000) {
		const fiveMinutesAgo = now - 5 * 60 * 1000;
		for (const [k, timestamp] of rateLimitMap.entries()) {
			if (timestamp < fiveMinutesAgo) {
				rateLimitMap.delete(k);
			}
		}
	}
}

/**
 * Remove members to resolve over-seat-limit situation
 * POST /api/teams/:teamId/resolve-seat-limit
 *
 * Rate limited to 1 request per minute per user/team combination
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { teamId } = event.params;

	// Apply rate limiting
	checkRateLimit(userId, teamId);

	const { memberIdsToRemove } = await event.request.json();

	// Input validation
	if (!Array.isArray(memberIdsToRemove) || memberIdsToRemove.length === 0) {
		throw error(400, {
			message: 'memberIdsToRemove must be a non-empty array of user IDs'
		});
	}

	// Prevent DoS with excessively large arrays
	if (memberIdsToRemove.length > 100) {
		throw error(400, {
			message: 'Cannot remove more than 100 members at once'
		});
	}

	// Validate ID format (Clerk IDs are alphanumeric strings)
	const validIdPattern = /^[a-zA-Z0-9_-]+$/;
	if (!memberIdsToRemove.every((id) => typeof id === 'string' && validIdPattern.test(id))) {
		throw error(400, {
			message: 'Invalid member ID format'
		});
	}

	// Prevent removing yourself (early validation - safe to do outside transaction)
	if (memberIdsToRemove.includes(userId)) {
		throw error(400, {
			message: 'You cannot remove yourself from the team'
		});
	}

	// Perform ALL operations inside transaction to prevent TOCTOU vulnerabilities
	const result = await db.$transaction(async (tx) => {
		// Fetch team data inside transaction for consistent state
		const team = await tx.team.findUnique({
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

		// Verify user is a member (inside transaction)
		const currentMember = team.members.find((m) => m.id === userId);
		if (!currentMember) {
			throw error(403, {
				message: 'You are not a member of this team'
			});
		}

		// Only admins/managers can remove members (inside transaction)
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

		// Verify all user IDs are valid team members
		const invalidIds = memberIdsToRemove.filter((id) => !team.members.some((m) => m.id === id));

		if (invalidIds.length > 0) {
			throw error(400, {
				message: 'Some user IDs are not members of this team'
			});
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
		const finalRemainingMembers = currentMembers - memberIdsToRemove.length;
		const isStillOverLimit = finalRemainingMembers > seatsNeeded;

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
