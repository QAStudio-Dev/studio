import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

/**
 * Decline an invitation
 * PATCH /api/invitations/[token]/decline
 */
export const PATCH: RequestHandler = async (event) => {
	const { token } = event.params;

	const invitation = await db.teamInvitation.findUnique({
		where: { token }
	});

	if (!invitation) {
		throw error(404, {
			message: 'Invitation not found'
		});
	}

	// Check if invitation is already processed
	if (invitation.status !== 'PENDING') {
		throw error(400, {
			message: `This invitation has already been ${invitation.status.toLowerCase()}`
		});
	}

	// Mark invitation as declined
	await db.teamInvitation.update({
		where: { id: invitation.id },
		data: {
			status: 'DECLINED',
			declinedAt: new Date()
		}
	});

	return json({ success: true });
};
