import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Create Stripe Customer Portal Session
 * Allows users to manage their subscription, payment methods, and invoices
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Get user with team and subscription
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

	if (!user?.team?.subscription) {
		return json({ error: 'No active subscription found' }, { status: 404 });
	}

	// Verify user has OWNER role
	if (user.role !== 'OWNER') {
		return json(
			{ error: 'Only users with OWNER role can access the billing portal' },
			{ status: 403 }
		);
	}

	// Verify user owns this specific subscription
	if (user.team.subscription.ownerId !== user.id) {
		return json(
			{ error: 'Only the subscription owner can access the billing portal' },
			{ status: 403 }
		);
	}

	const { stripeCustomerId } = user.team.subscription;

	// Create a portal session
	const portalSession = await stripe.billingPortal.sessions.create({
		customer: stripeCustomerId,
		return_url: `${event.url.origin}/settings`
	});

	return json({ url: portalSession.url });
};
