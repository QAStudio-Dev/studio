import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { decrypt } from '$lib/server/encryption';
import { checkRateLimit } from '$lib/server/rate-limit';
import { E164_PHONE_REGEX } from '$lib/validation/twilio';
import { randomBytes } from 'crypto';

export const Input = z.object({
	to: z.string().regex(E164_PHONE_REGEX).describe('Recipient phone number in E.164 format'),
	body: z.string().min(1).max(1600).describe('SMS message body (max 1600 characters)')
});

export const Output = z.object({
	success: z.boolean(),
	messageSid: z.string().describe('Twilio message SID'),
	status: z.string().describe('Message status (queued, sent, etc.)'),
	to: z.string(),
	from: z.string(),
	body: z.string(),
	dateCreated: z.string()
});

export const Error = {
	400: error(400, 'Invalid request or Twilio not configured'),
	403: error(403, 'Twilio integration requires Pro or Enterprise plan'),
	404: error(404, 'Team not found'),
	429: error(429, 'Rate limit exceeded. Too many SMS messages sent.'),
	500: error(500, 'Failed to send SMS')
};

export const Modifier = (r: any) => {
	r.tags = ['Twilio Integration'];
	r.summary = 'Send SMS message';
	r.description = 'Send an SMS message via Twilio. Pro/Enterprise plans only.';
	return r;
};

export default new Endpoint({ Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const userId = await requireApiAuth(evt);

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
						twilioAuthToken: true,
						twilioPhoneNumber: true,
						twilioMessagingUrl: true
					}
				}
			}
		});

		if (!user?.teamId || !user.team) {
			throw Error[404];
		}

		// Rate limiting: Plan-based SMS limits per hour
		const rateLimitByPlan = {
			FREE: 0, // Not allowed
			PRO: 100,
			ENTERPRISE: 1000
		};

		const limit = rateLimitByPlan[user.team.plan];

		await checkRateLimit({
			key: `twilio_sms:${user.teamId}`,
			limit,
			window: 3600, // 1 hour
			prefix: 'ratelimit:twilio'
		});

		// Check if team has Pro or Enterprise plan
		if (user.team.plan === 'FREE') {
			throw Error[403];
		}

		// Check if Twilio is configured and enabled
		if (!user.team.twilioEnabled) {
			throw error(400, 'Twilio is not enabled for your team');
		}

		if (
			!user.team.twilioAccountSid ||
			!user.team.twilioAuthToken ||
			!user.team.twilioPhoneNumber
		) {
			throw error(400, 'Twilio is not properly configured');
		}

		// Decrypt credentials
		const accountSid = decrypt(user.team.twilioAccountSid);
		const authToken = decrypt(user.team.twilioAuthToken);
		const from = user.team.twilioPhoneNumber;

		// Send SMS via Twilio API
		const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
		const twilioAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

		try {
			const twilioResponse = await fetch(twilioUrl, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${twilioAuth}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					To: input.to,
					From: from,
					Body: input.body
				})
			});

			if (!twilioResponse.ok) {
				const errorData = await twilioResponse.json();
				throw error(twilioResponse.status, errorData.message || 'Failed to send SMS');
			}

			const twilioData = await twilioResponse.json();

			// Store sent message in database for audit trail
			try {
				await db.smsMessage.create({
					data: {
						teamId: user.teamId,
						direction: 'OUTBOUND',
						messageSid: twilioData.sid,
						from: twilioData.from,
						to: twilioData.to,
						body: twilioData.body,
						accountSid: user.team.twilioAccountSid, // Already encrypted in team settings
						status: twilioData.status,
						sentBy: userId
					}
				});
			} catch (dbError: any) {
				// Log database error but don't fail the API request
				// The SMS was already sent successfully
				console.error('[Twilio SMS] Failed to store sent message:', dbError);
			}

			return {
				success: true,
				messageSid: twilioData.sid,
				status: twilioData.status,
				to: twilioData.to,
				from: twilioData.from,
				body: twilioData.body,
				dateCreated: twilioData.date_created
			};
		} catch (err: any) {
			if (err.status) throw err; // Re-throw errors we created
			console.error('Twilio SMS send failed:', err);

			// Store failed message attempt
			try {
				await db.smsMessage.create({
					data: {
						teamId: user.teamId,
						direction: 'OUTBOUND',
						messageSid: `FAILED_${Date.now()}_${randomBytes(4).toString('hex')}`, // Generate unique ID for failed messages
						from: from,
						to: input.to,
						body: input.body,
						accountSid: user.team.twilioAccountSid, // Already encrypted in team settings
						status: 'failed',
						sentBy: userId,
						errorCode: err.code?.toString(),
						errorMessage: err.message
					}
				});
			} catch (dbError: any) {
				console.error('[Twilio SMS] Failed to store error message:', dbError);
			}

			throw Error[500];
		}
	}
);
