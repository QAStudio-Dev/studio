import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * GET /api/integrations/twilio/messages
 * List all SMS messages for the authenticated user's team
 *
 * Query parameters:
 * - limit: Number of messages to return (default: 100, max: 1000)
 * - offset: Number of messages to skip for pagination (default: 0)
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Parse pagination parameters
	const url = new URL(event.request.url);
	const limitParam = url.searchParams.get('limit');
	const offsetParam = url.searchParams.get('offset');

	const limit = Math.min(Math.max(1, parseInt(limitParam || '100')), 1000);
	const offset = Math.max(0, parseInt(offsetParam || '0'));

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
		const [messages, total] = await Promise.all([
			db.smsMessage.findMany({
				where: {
					teamId: user.teamId
				},
				orderBy: {
					createdAt: 'desc'
				},
				take: limit,
				skip: offset
			}),
			db.smsMessage.count({
				where: {
					teamId: user.teamId
				}
			})
		]);

		return json({
			messages,
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + messages.length < total
			}
		});
	} catch (error) {
		console.error('Error fetching SMS messages:', error);
		return json({ message: 'Failed to fetch messages' }, { status: 500 });
	}
};
