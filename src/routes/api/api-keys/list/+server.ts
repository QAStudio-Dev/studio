import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * List all API keys for the current user
 * GET /api/api-keys/list
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const apiKeys = await db.apiKey.findMany({
		where: { userId },
		select: {
			id: true,
			name: true,
			prefix: true,
			lastUsedAt: true,
			expiresAt: true,
			createdAt: true
		},
		orderBy: {
			createdAt: 'desc'
		}
	});

	return json({ apiKeys });
};
