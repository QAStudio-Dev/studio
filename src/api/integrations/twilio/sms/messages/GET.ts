import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { decrypt } from '$lib/server/encryption';

export const Query = z.object({
	limit: z.coerce
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe('Maximum number of messages to return (max 100)'),
	direction: z.enum(['inbound', 'outbound']).optional().describe('Filter by message direction')
});

const MessageSchema = z.object({
	sid: z.string(),
	from: z.string(),
	to: z.string(),
	body: z.string(),
	status: z.string(),
	direction: z.enum(['inbound', 'outbound-api', 'outbound-call', 'outbound-reply']),
	dateCreated: z.string(),
	dateSent: z.string().nullable(),
	dateUpdated: z.string(),
	numMedia: z.number(),
	errorCode: z.string().nullable(),
	errorMessage: z.string().nullable()
});

export const Output = z.object({
	messages: z.array(MessageSchema),
	total: z.number(),
	phoneNumber: z.string()
});

export const Error = {
	400: error(400, 'Twilio is not configured for this team'),
	403: error(403, 'Twilio integration requires Pro or Enterprise plan'),
	404: error(404, 'Team not found'),
	500: error(500, 'Failed to fetch messages from Twilio')
};

export const Modifier = (r: any) => {
	r.tags = ['Twilio Integration'];
	r.summary = 'Get SMS messages';
	r.description = 'Get recent SMS messages from Twilio. Pro/Enterprise plans only.';
	return r;
};

export default new Endpoint({ Query, Output, Error, Modifier }).handle(
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
						twilioPhoneNumber: true
					}
				}
			}
		});

		if (!user?.teamId || !user.team) {
			throw Error[404];
		}

		// Check if team has Pro or Enterprise plan
		if (user.team.plan === 'FREE') {
			throw Error[403];
		}

		// Check if Twilio is configured
		if (
			!user.team.twilioEnabled ||
			!user.team.twilioAccountSid ||
			!user.team.twilioAuthToken ||
			!user.team.twilioPhoneNumber
		) {
			throw Error[400];
		}

		// Decrypt credentials
		const accountSid = decrypt(user.team.twilioAccountSid);
		const authToken = decrypt(user.team.twilioAuthToken);
		const phoneNumber = user.team.twilioPhoneNumber;

		// Build Twilio API URL with query parameters
		const limit = input.limit || 20;
		const params = new URLSearchParams({
			PageSize: limit.toString()
		});

		if (input.direction) {
			if (input.direction === 'inbound') {
				params.append('To', phoneNumber);
			} else {
				params.append('From', phoneNumber);
			}
		}

		const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?${params}`;
		const twilioAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

		try {
			const twilioResponse = await fetch(twilioUrl, {
				headers: {
					Authorization: `Basic ${twilioAuth}`
				}
			});

			if (!twilioResponse.ok) {
				const errorData = await twilioResponse.json();
				throw error(twilioResponse.status, errorData.message || 'Failed to fetch messages');
			}

			const twilioData = await twilioResponse.json();

			// Map direction to simplified format
			const messages = twilioData.messages.map((msg: any) => ({
				sid: msg.sid,
				from: msg.from,
				to: msg.to,
				body: msg.body,
				status: msg.status,
				direction: msg.direction,
				dateCreated: msg.date_created,
				dateSent: msg.date_sent,
				dateUpdated: msg.date_updated,
				numMedia: parseInt(msg.num_media || '0'),
				errorCode: msg.error_code,
				errorMessage: msg.error_message
			}));

			return {
				messages,
				total: messages.length,
				phoneNumber
			};
		} catch (err: any) {
			if (err.status) throw err; // Re-throw errors we created
			throw Error[500];
		}
	}
);
