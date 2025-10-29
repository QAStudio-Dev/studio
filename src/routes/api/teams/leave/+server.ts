import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

/**
 * POST /api/teams/leave
 * Leave the current team (soft delete - removes user from team and all projects)
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	try {
		// Get user's current team
		const user = await db.user.findUnique({
			where: { id: userId },
			include: {
				team: {
					include: {
						members: true
					}
				}
			}
		});

		if (!user?.teamId) {
			return json({ message: 'You are not part of a team' }, { status: 400 });
		}

		// Check if user is the last member
		if (user.team && user.team.members.length === 1) {
			return json(
				{
					message:
						'Cannot leave team as you are the only member. Please contact support to delete the team.'
				},
				{ status: 400 }
			);
		}

		// Remove user from team by setting teamId to null
		await db.user.update({
			where: { id: userId },
			data: {
				teamId: null,
				role: 'MEMBER' // Reset role when leaving team
			}
		});

		return json({ message: 'Successfully left the team' });
	} catch (error: any) {
		console.error('Error leaving team:', error);
		return json({ message: error.message || 'Failed to leave team' }, { status: 500 });
	}
};
