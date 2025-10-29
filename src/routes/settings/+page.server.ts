import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/sign-in');
	}

	// Get user with team and subscription info
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true,
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
		throw redirect(302, '/sign-in');
	}

	return {
		user
	};
};
