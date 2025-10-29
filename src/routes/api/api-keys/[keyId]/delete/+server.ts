import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Delete an API key
 * DELETE /api/api-keys/[keyId]/delete
 */
export const DELETE: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { keyId } = event.params;

	// Check if key exists and belongs to user
	const apiKey = await db.apiKey.findUnique({
		where: { id: keyId }
	});

	if (!apiKey) {
		throw error(404, { message: 'API key not found' });
	}

	if (apiKey.userId !== userId) {
		throw error(403, { message: 'You do not have permission to delete this API key' });
	}

	// Delete the key
	await db.apiKey.delete({
		where: { id: keyId }
	});

	return json({ success: true });
};
