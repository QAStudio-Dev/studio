import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionToken, clearSessionCookies, deleteSession } from '$lib/server/sessions';

export const POST: RequestHandler = async (event) => {
	// Get session token
	const sessionToken = getSessionToken(event);

	if (sessionToken) {
		// Delete session from database
		await deleteSession(sessionToken);
	}

	// Clear cookies
	clearSessionCookies(event);

	return json({ success: true });
};
