import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionId, clearSessionCookies, deleteSession } from '$lib/server/sessions';
import { createAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async (event) => {
	// Get session ID
	const sessionId = getSessionId(event);

	if (sessionId) {
		// Get user ID from session before deleting
		const session = await db.session.findUnique({
			where: { id: sessionId },
			select: { userId: true, user: { select: { teamId: true, email: true } } }
		});

		if (session) {
			// Audit logout
			await createAuditLog({
				userId: session.userId,
				teamId: session.user.teamId ?? undefined,
				action: 'USER_LOGOUT',
				resourceType: 'Session',
				resourceId: sessionId,
				metadata: {
					email: session.user.email
				},
				event
			});
		}

		// Delete session from database
		await deleteSession(sessionId);
	}

	// Clear cookies
	clearSessionCookies(event);

	return json({ success: true });
};
