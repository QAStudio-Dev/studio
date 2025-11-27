import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionId, clearSessionCookies, deleteSession } from '$lib/server/sessions';

export const POST: RequestHandler = async (event) => {
	// Get session ID
	const sessionId = getSessionId(event);

	if (sessionId) {
		// Delete session from database
		await deleteSession(sessionId);
	}

	// Clear cookies
	clearSessionCookies(event);

	return json({ success: true });
};
