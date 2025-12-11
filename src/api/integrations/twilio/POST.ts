import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { encrypt } from '$lib/server/encryption';

export const Input = z.object({
	accountSid: z
		.string()
		.min(1)
		.regex(/^AC[a-f0-9]{32}$/)
		.describe('Twilio Account SID (starts with AC followed by 32 hex characters)'),
	authToken: z.string().min(1).describe('Twilio Auth Token (will be encrypted)'),
	phoneNumber: z
		.string()
		.regex(/^\+[1-9]\d{1,14}$/)
		.describe('Phone number in E.164 format (e.g., +15551234567)'),
	messagingUrl: z.string().optional().describe('Optional Messaging Service SID or webhook URL')
});

export const Output = z.object({
	message: z.string(),
	twilioEnabled: z.boolean(),
	twilioPhoneNumber: z.string(),
	twilioMessagingUrl: z.string().nullable(),
	twilioConfiguredAt: z.coerce.string(),
	twilioConfiguredBy: z.string()
});

export const Error = {
	400: error(400, 'Invalid request - check required fields and phone number format'),
	403: error(403, 'Insufficient permissions or plan upgrade required'),
	404: error(404, 'Team not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Twilio Integration'];
	r.summary = 'Configure Twilio integration';
	r.description =
		'Configure or update Twilio integration for the team. Requires OWNER, ADMIN, or MANAGER role. Pro/Enterprise plans only.';
	return r;
};

export default new Endpoint({ Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const userId = await requireApiAuth(evt);

		// Get user's team
		const user = await db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				role: true,
				teamId: true,
				team: {
					select: {
						id: true,
						plan: true
					}
				}
			}
		});

		if (!user?.teamId || !user.team) {
			throw Error[404];
		}

		// Check if user has permission (OWNER, ADMIN, or MANAGER)
		if (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
			throw Error[403];
		}

		// Check if team has Pro or Enterprise plan
		if (user.team.plan === 'FREE') {
			throw Error[403];
		}

		// Encrypt sensitive credentials
		const encryptedAccountSid = encrypt(input.accountSid);
		const encryptedAuthToken = encrypt(input.authToken);

		// Update team configuration
		const updatedTeam = await db.team.update({
			where: { id: user.teamId },
			data: {
				twilioEnabled: true,
				twilioAccountSid: encryptedAccountSid,
				twilioAuthToken: encryptedAuthToken,
				twilioPhoneNumber: input.phoneNumber,
				twilioMessagingUrl: input.messagingUrl || null,
				twilioConfiguredAt: new Date(),
				twilioConfiguredBy: userId
			},
			select: {
				twilioEnabled: true,
				twilioPhoneNumber: true,
				twilioMessagingUrl: true,
				twilioConfiguredAt: true,
				twilioConfiguredBy: true
			}
		});

		return {
			message: 'Twilio configuration saved successfully',
			twilioEnabled: updatedTeam.twilioEnabled,
			twilioPhoneNumber: updatedTeam.twilioPhoneNumber!,
			twilioMessagingUrl: updatedTeam.twilioMessagingUrl,
			twilioConfiguredAt: updatedTeam.twilioConfiguredAt!.toISOString(),
			twilioConfiguredBy: updatedTeam.twilioConfiguredBy!
		};
	}
);
