import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { createPortalSession } from '$lib/server/stripe';
import { PUBLIC_BASE_URL } from '$env/static/public';

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 * POST /api/teams/portal
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const { teamId } = await event.request.json();

	if (!teamId) {
		throw error(400, {
			message: 'Team ID is required'
		});
	}

	// Verify team exists and user is a member with ADMIN or MANAGER role
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

	if (!user?.team || user.team.id !== teamId) {
		throw error(403, {
			message: 'You are not a member of this team'
		});
	}

	if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
		throw error(403, {
			message: 'Only team admins and managers can access billing'
		});
	}

	if (!user.team.subscription) {
		throw error(400, {
			message: 'Team does not have a subscription'
		});
	}

	const baseUrl = PUBLIC_BASE_URL || event.url.origin;

	// Create Stripe Customer Portal Session
	const session = await createPortalSession(
		user.team.subscription.stripeCustomerId,
		`${baseUrl}/teams/${teamId}`
	);

	return json({ url: session.url });
};
