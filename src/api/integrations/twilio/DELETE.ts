import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';

export const Output = z.object({
	message: z.string().describe('Success message')
});

export const Error = {
	403: error(403, 'Insufficient permissions'),
	404: error(404, 'Team not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Twilio Integration'];
	r.summary = 'Remove Twilio configuration';
	r.description =
		'Remove Twilio configuration from the team. Requires OWNER, ADMIN, or MANAGER role.';
	return r;
};

export default new Endpoint({ Output, Error, Modifier }).handle(
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
						id: true
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

		// Remove Twilio configuration
		await db.team.update({
			where: { id: user.teamId },
			data: {
				twilioEnabled: false,
				twilioAccountSid: null,
				twilioAuthToken: null,
				twilioPhoneNumber: null,
				twilioMessagingUrl: null,
				twilioConfiguredAt: null,
				twilioConfiguredBy: null
			}
		});

		return {
			message: 'Twilio configuration removed successfully'
		};
	}
);
