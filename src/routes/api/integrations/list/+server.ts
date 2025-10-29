import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

/**
 * GET /api/integrations/list
 * List all integrations for the user's team
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	try {
		// Get user's team
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		});

		if (!user?.teamId) {
			return json({ integrations: [] });
		}

		// Get all integrations for the team
		const integrations = await db.integration.findMany({
			where: { teamId: user.teamId },
			select: {
				id: true,
				type: true,
				name: true,
				status: true,
				config: true,
				installedBy: true,
				lastSyncedAt: true,
				createdAt: true,
				updatedAt: true
				// Don't return sensitive tokens
			},
			orderBy: { createdAt: 'desc' }
		});

		return json({ integrations });
	} catch (error: any) {
		console.error('Error fetching integrations:', error);
		return json({ message: error.message || 'Failed to fetch integrations' }, { status: 500 });
	}
};
