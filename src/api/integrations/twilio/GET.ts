import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { decrypt } from '$lib/server/encryption';

export const Output = z.object({
	twilioEnabled: z.boolean().describe('Whether Twilio integration is enabled'),
	twilioPhoneNumber: z.string().nullable().describe('Twilio phone number in E.164 format'),
	twilioMessagingUrl: z
		.string()
		.nullable()
		.describe('Optional Messaging Service SID or webhook URL'),
	twilioConfiguredAt: z.coerce.string().nullable().describe('When Twilio was last configured'),
	twilioConfiguredBy: z.string().nullable().describe('User ID who configured Twilio'),
	hasAccountSid: z.boolean().describe('Whether Account SID is configured'),
	hasAuthToken: z.boolean().describe('Whether Auth Token is configured')
});

export const Error = {
	403: error(403, 'Twilio integration requires Pro or Enterprise plan'),
	404: error(404, 'Team not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Twilio Integration'];
	r.summary = 'Get Twilio configuration';
	r.description =
		"Get Twilio configuration for the authenticated user's team. Requires Pro or Enterprise plan.";
	return r;
};

export default new Endpoint({ Output, Error, Modifier }).handle(
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
						twilioMessagingUrl: true,
						twilioConfiguredAt: true,
						twilioConfiguredBy: true
					}
				}
			}
		});

		if (!user?.teamId || !user.team) {
			throw Error[404];
		}

		// Check if user has access to Twilio (Pro/Enterprise plans only)
		if (user.team.plan === 'FREE') {
			throw Error[403];
		}

		return {
			twilioEnabled: user.team.twilioEnabled,
			twilioPhoneNumber: user.team.twilioPhoneNumber,
			twilioMessagingUrl: user.team.twilioMessagingUrl,
			twilioConfiguredAt: user.team.twilioConfiguredAt?.toISOString() ?? null,
			twilioConfiguredBy: user.team.twilioConfiguredBy,
			hasAccountSid: !!user.team.twilioAccountSid,
			hasAuthToken: !!user.team.twilioAuthToken
		};
	}
);
