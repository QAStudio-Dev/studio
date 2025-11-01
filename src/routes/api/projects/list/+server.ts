import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async (event) => {
	// Check if Clerk auth is available
	if (!event.locals.auth || typeof event.locals.auth !== 'function') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId } = event.locals.auth() || {};

	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		if (!user) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Get projects the user has access to
		const projects = await db.project.findMany({
			where: {
				OR: [{ createdBy: userId }, ...(user.teamId ? [{ teamId: user.teamId }] : [])]
			},
			select: {
				id: true,
				name: true,
				key: true
			},
			orderBy: {
				updatedAt: 'desc'
			}
		});

		return json({ projects });
	} catch (err) {
		console.error('Failed to fetch projects:', err);
		return json({ error: 'Failed to fetch projects' }, { status: 500 });
	}
};
