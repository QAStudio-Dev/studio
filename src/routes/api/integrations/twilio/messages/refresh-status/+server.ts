import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { decrypt } from '$lib/server/encryption';
import { checkRateLimit } from '$lib/server/rate-limit';

/**
 * POST /api/integrations/twilio/messages/refresh-status
 * Refresh the delivery status of recent outbound SMS messages by polling Twilio's API
 *
 * This endpoint fetches the latest status for outbound messages that are not in a final state
 * (queued, sending, sent) and updates the database with the current status from Twilio.
 *
 * Rate limit: 1 request per minute per message (or per user for bulk refresh) to prevent excessive API calls to Twilio
 *
 * Query parameters:
 * - messageSid: (optional) Refresh a specific message by SID. If not provided, refreshes recent messages.
 * - hours: (optional) How many hours back to check (default: 24, max: 168 for 7 days)
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Parse query parameters
	const url = new URL(event.request.url);
	const messageSid = url.searchParams.get('messageSid');

	// Rate limiting: 1 request per minute per message (or per user for bulk refresh)
	const rateLimitKey = messageSid
		? `sms_refresh:message:${messageSid}`
		: `sms_refresh:user:${userId}`;

	await checkRateLimit({
		key: rateLimitKey,
		limit: 1,
		window: 60, // 1 minute
		prefix: 'ratelimit:sms_refresh'
	});
	const hoursParam = url.searchParams.get('hours');
	const hours = Math.min(Math.max(1, parseInt(hoursParam || '24') || 24), 168);

	// Get user's team with Twilio configuration
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			teamId: true,
			team: {
				select: {
					plan: true,
					twilioEnabled: true,
					twilioAccountSid: true,
					twilioAuthToken: true
				}
			}
		}
	});

	if (!user?.teamId || !user.team) {
		return json({ message: 'Team not found' }, { status: 404 });
	}

	// Check if team has Pro or Enterprise plan
	if (user.team.plan === 'FREE') {
		return json(
			{ message: 'Twilio integration requires Pro or Enterprise plan' },
			{ status: 403 }
		);
	}

	// Check if Twilio is configured
	if (!user.team.twilioEnabled || !user.team.twilioAccountSid || !user.team.twilioAuthToken) {
		return json({ message: 'Twilio is not configured for your team' }, { status: 400 });
	}

	// Decrypt credentials
	const accountSid = decrypt(user.team.twilioAccountSid);
	const authToken = decrypt(user.team.twilioAuthToken);
	const twilioAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

	try {
		// Build query for messages to refresh
		const where: any = {
			teamId: user.teamId,
			direction: 'OUTBOUND'
		};

		// If specific messageSid provided, only refresh that one
		if (messageSid) {
			where.messageSid = messageSid;
		} else {
			// Otherwise, refresh recent messages that might not be in final state
			const cutoffDate = new Date();
			cutoffDate.setHours(cutoffDate.getHours() - hours);

			where.createdAt = { gte: cutoffDate };
			where.status = {
				in: ['queued', 'sending', 'sent', 'accepted'] // Non-final states
			};
		}

		// Fetch messages to refresh
		const messages = await db.smsMessage.findMany({
			where,
			select: {
				id: true,
				messageSid: true,
				status: true
			},
			orderBy: { createdAt: 'desc' },
			take: 100 // Limit to prevent excessive API calls
		});

		if (messages.length === 0) {
			return json({
				message: 'No messages to refresh',
				updated: 0,
				checked: 0
			});
		}

		// Fetch status from Twilio for each message
		const updates: Array<{ messageSid: string; oldStatus: string | null; newStatus: string }> =
			[];
		let errorCount = 0;

		for (const message of messages) {
			try {
				const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${message.messageSid}.json`;

				const response = await fetch(twilioUrl, {
					method: 'GET',
					headers: {
						Authorization: `Basic ${twilioAuth}`
					}
				});

				if (!response.ok) {
					console.error(
						`Failed to fetch status for ${message.messageSid}: ${response.status}`
					);
					errorCount++;
					continue;
				}

				const twilioData = await response.json();
				const newStatus = twilioData.status;

				// Only update if status has changed
				if (newStatus && newStatus !== message.status) {
					await db.smsMessage.update({
						where: { id: message.id },
						data: {
							status: newStatus,
							...(twilioData.error_code && {
								errorCode: twilioData.error_code.toString()
							}),
							...(twilioData.error_message && {
								errorMessage: twilioData.error_message
							})
						}
					});

					updates.push({
						messageSid: message.messageSid,
						oldStatus: message.status,
						newStatus
					});
				}
			} catch (err) {
				console.error(`Error refreshing status for ${message.messageSid}:`, err);
				errorCount++;
			}
		}

		return json({
			message: `Checked ${messages.length} message${messages.length === 1 ? '' : 's'}, updated ${updates.length}`,
			checked: messages.length,
			updated: updates.length,
			errors: errorCount,
			updates: updates.length > 0 ? updates : undefined
		});
	} catch (error) {
		console.error('Error refreshing message statuses:', error);
		const message = error instanceof Error ? error.message : 'Failed to refresh statuses';
		return json(
			{
				message,
				...(process.env.NODE_ENV === 'development' && { details: error })
			},
			{ status: 500 }
		);
	}
};
