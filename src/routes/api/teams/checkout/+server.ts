import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { createCheckoutSession } from '$lib/server/stripe';
import { PUBLIC_BASE_URL } from '$env/static/public';

/**
 * Create a Stripe Checkout session for team subscription
 * POST /api/teams/checkout
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const { teamId, priceId } = await event.request.json();

	if (!teamId || !priceId) {
		throw error(400, {
			message: 'Team ID and price ID are required'
		});
	}

	// Verify team exists and user is a member
	const team = await db.team.findUnique({
		where: { id: teamId },
		include: {
			members: true,
			subscription: true
		}
	});

	if (!team) {
		throw error(404, {
			message: 'Team not found'
		});
	}

	const isMember = team.members.some((member) => member.id === userId);
	if (!isMember) {
		throw error(403, {
			message: 'You are not a member of this team'
		});
	}

	// Check if team already has an active subscription
	if (team.subscription && team.subscription.status === 'ACTIVE') {
		throw error(400, {
			message: 'Team already has an active subscription'
		});
	}

	// Get user email
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	if (!user) {
		throw error(404, {
			message: 'User not found'
		});
	}

	const baseUrl = PUBLIC_BASE_URL || event.url.origin;

	// Create Stripe Checkout Session
	const session = await createCheckoutSession({
		teamId: team.id,
		teamName: team.name,
		priceId,
		customerEmail: user.email,
		successUrl: `${baseUrl}/teams/${team.id}?checkout=success`,
		cancelUrl: `${baseUrl}/teams/${team.id}?checkout=canceled`
	});

	return json({ url: session.url });
};
