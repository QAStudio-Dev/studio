import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generatePageMetaTags } from '$lib/utils/meta-tags';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	// Get user with team and subscription info
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			role: true,
			teamId: true,
			imageUrl: true,
			team: {
				select: {
					id: true,
					name: true,
					description: true,
					plan: true,
					twilioEnabled: true,
					twilioPhoneNumber: true,
					members: {
						select: {
							id: true,
							email: true,
							firstName: true,
							lastName: true,
							role: true,
							createdAt: true
						}
					},
					subscription: true,
					integrations: {
						select: {
							id: true,
							type: true,
							name: true,
							status: true,
							config: true,
							installedBy: true,
							lastSyncedAt: true,
							createdAt: true
						},
						orderBy: { createdAt: 'desc' }
					}
				}
			},
			apiKeys: {
				orderBy: { createdAt: 'desc' }
			}
		}
	});

	if (!user) {
		throw redirect(302, '/login');
	}

	return {
		user,
		pageMetaTags: generatePageMetaTags(
			'Settings',
			'Configure your account settings, manage API keys for automation, invite and organize team members, and set up integrations with external tools like Jira and Twilio.'
		)
	};
};
