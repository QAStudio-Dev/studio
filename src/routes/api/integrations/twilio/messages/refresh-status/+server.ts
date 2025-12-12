import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { decrypt } from '$lib/server/encryption';
import { checkRateLimit } from '$lib/server/rate-limit';

// Configuration constants
const BATCH_SIZE = 10; // Process 10 messages in parallel at a time
const DEFAULT_HOURS = 24;
const MAX_HOURS = 168; // 7 days
const MIN_HOURS = 1;
const RATE_LIMIT_WINDOW = 60; // 1 minute in seconds
const MAX_MESSAGES_TO_REFRESH = 100;

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
		window: RATE_LIMIT_WINDOW,
		prefix: 'ratelimit:sms_refresh'
	});
	const hoursParam = url.searchParams.get('hours');
	const parsedHours = hoursParam ? parseInt(hoursParam) : DEFAULT_HOURS;
	const hours = Math.min(
		Math.max(MIN_HOURS, isNaN(parsedHours) ? DEFAULT_HOURS : parsedHours),
		MAX_HOURS
	);

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
		// Using Record type to allow dynamic property assignment
		const where: Record<string, any> = {
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
			take: MAX_MESSAGES_TO_REFRESH
		});

		if (messages.length === 0) {
			return json({
				message: 'No messages to refresh',
				updated: 0,
				checked: 0
			});
		}

		// Fetch status from Twilio for each message in parallel batches
		const updates: Array<{ messageSid: string; oldStatus: string | null; newStatus: string }> =
			[];
		let errorCount = 0;

		// Process messages in batches to avoid overwhelming the API
		for (let i = 0; i < messages.length; i += BATCH_SIZE) {
			const batch = messages.slice(i, i + BATCH_SIZE);

			const batchResults = await Promise.allSettled(
				batch.map(async (message) => {
					const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${message.messageSid}.json`;

					const response = await fetch(twilioUrl, {
						method: 'GET',
						headers: {
							Authorization: `Basic ${twilioAuth}`
						}
					});

					if (!response.ok) {
						const errorBody = await response.text();
						throw new Error(
							`Failed to fetch status for ${message.messageSid}: ${response.status} - ${errorBody}`
						);
					}

					const twilioData = await response.json();

					// Validate response structure
					if (!twilioData || typeof twilioData.status !== 'string') {
						throw new Error(
							`Invalid status from Twilio for ${message.messageSid}: ${JSON.stringify(twilioData)}`
						);
					}

					return { message, twilioData };
				})
			);

			// Process results from this batch
			for (const result of batchResults) {
				if (result.status === 'rejected') {
					console.error('Twilio API error:', result.reason);
					errorCount++;
					continue;
				}

				const { message, twilioData } = result.value;
				const newStatus = twilioData.status;

				// Only update if status has changed
				if (newStatus !== message.status) {
					await db.smsMessage.update({
						where: { id: message.id },
						data: {
							status: newStatus,
							// Explicitly clear or set error fields
							errorCode: twilioData.error_code?.toString() || null,
							errorMessage: twilioData.error_message || null
						}
					});

					updates.push({
						messageSid: message.messageSid,
						oldStatus: message.status,
						newStatus
					});
				}
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
				message
			},
			{ status: 500 }
		);
	}
};
