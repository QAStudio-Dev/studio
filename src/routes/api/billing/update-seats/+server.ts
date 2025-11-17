import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateSubscriptionSeats } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Update subscription seat count
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { seats } = await event.request.json();

	// Validate seats
	if (!seats || seats < 1) {
		return json({ error: 'Invalid seat count. Must be at least 1.' }, { status: 400 });
	}

	// Get user with team and subscription
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			team: {
				include: {
					subscription: true,
					members: true
				}
			}
		}
	});

	if (!user || !user.team?.subscription) {
		return json({ error: 'No active subscription found' }, { status: 404 });
	}

	// Only OWNER can update seats
	if (user.role !== 'OWNER') {
		return json(
			{ error: 'Only the subscription owner can update seat count' },
			{ status: 403 }
		);
	}

	// Check if user is trying to reduce seats below current member count
	const currentMemberCount = user.team.members.length;
	if (seats < currentMemberCount) {
		return json(
			{
				error: `Cannot reduce seats to ${seats}. You currently have ${currentMemberCount} team members. Please remove members first.`
			},
			{ status: 400 }
		);
	}

	try {
		// Update Stripe subscription
		const subscriptionId = user.team.subscription.stripeSubscriptionId;
		if (!subscriptionId) {
			return json({ error: 'No Stripe subscription ID found' }, { status: 404 });
		}

		const updatedSubscription = await updateSubscriptionSeats(subscriptionId, seats);

		// Update database
		await db.subscription.update({
			where: { id: user.team.subscription.id },
			data: {
				seats: seats
			}
		});

		return json({
			success: true,
			seats: seats,
			message: `Successfully updated to ${seats} seat${seats !== 1 ? 's' : ''}. Your next invoice will reflect this change.`
		});
	} catch (error) {
		console.error('Failed to update seats:', error);
		return json({ error: 'Failed to update subscription seats' }, { status: 500 });
	}
};
