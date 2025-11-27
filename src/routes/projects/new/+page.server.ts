import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { isSubscriptionCurrent } from '$lib/server/subscriptions';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	// Get user with team and subscription info
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true
				}
			}
		}
	});

	if (!user) {
		throw redirect(302, '/login');
	}

	// Check if user has active subscription (ACTIVE or PAST_DUE for grace period)
	const hasActiveSubscription = isSubscriptionCurrent(user.team?.subscription);

	// Count existing projects
	const projectCount = await db.project.count({
		where: user.teamId
			? {
					teamId: user.teamId
				}
			: {
					createdBy: userId,
					teamId: null
				}
	});

	return {
		hasActiveSubscription,
		projectCount,
		canCreateProject: hasActiveSubscription || projectCount < 1
	};
};
