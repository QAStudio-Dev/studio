import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { createAuditLog } from '$lib/server/audit';

/**
 * Create a new team
 * POST /api/teams/create
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const { name, description } = await event.request.json();

	if (!name || typeof name !== 'string') {
		throw error(400, {
			message: 'Team name is required'
		});
	}

	// Check if user is already in a team
	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (user?.teamId) {
		throw error(400, {
			message: 'You are already a member of a team. Leave your current team first.'
		});
	}

	// Create the team
	const team = await db.team.create({
		data: {
			name,
			description,
			members: {
				connect: { id: userId }
			}
		},
		include: {
			members: true,
			subscription: true
		}
	});

	// Update user role to ADMIN (team creator)
	await db.user.update({
		where: { id: userId },
		data: { role: 'ADMIN' }
	});

	// Audit log team creation
	await createAuditLog({
		userId,
		teamId: team.id,
		action: 'TEAM_CREATED',
		resourceType: 'Team',
		resourceId: team.id,
		metadata: {
			teamName: team.name,
			description: team.description
		},
		event
	});

	return json({ team });
};
