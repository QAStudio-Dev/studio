import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * GET /api/integrations/twilio/messages
 * List all SMS messages for the authenticated user's team
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Get user's team
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			teamId: true,
			team: {
				select: {
					plan: true,
					twilioEnabled: true
				}
			}
		}
	});

	if (!user?.teamId || !user.team) {
		return json({ message: 'Team not found' }, { status: 404 });
	}

	// Check if Twilio is enabled
	if (!user.team.twilioEnabled) {
		return json({ message: 'Twilio integration is not enabled' }, { status: 400 });
	}

	// Check plan (Pro/Enterprise only)
	if (user.team.plan === 'FREE') {
		return json(
			{ message: 'Twilio integration requires Pro or Enterprise plan' },
			{ status: 403 }
		);
	}

	// Fetch messages for this team
	try {
		const messages = await db.smsMessage.findMany({
			where: {
				teamId: user.teamId
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: 100 // Limit to 100 most recent messages
		});

		return json(messages);
	} catch (error) {
		console.error('Error fetching SMS messages:', error);
		return json({ message: 'Failed to fetch messages' }, { status: 500 });
	}
};
