import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

if (!STRIPE_SECRET_KEY) {
	throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2025-01-27.acacia',
	typescript: true
});

export interface CheckoutSessionParams {
	teamId: string;
	teamName: string;
	priceId: string;
	customerEmail: string;
	successUrl: string;
	cancelUrl: string;
}

/**
 * Create a Stripe Checkout Session for team subscription
 */
export async function createCheckoutSession(params: CheckoutSessionParams) {
	const { teamId, teamName, priceId, customerEmail, successUrl, cancelUrl } = params;

	const session = await stripe.checkout.sessions.create({
		mode: 'subscription',
		payment_method_types: ['card'],
		customer_email: customerEmail,
		line_items: [
			{
				price: priceId,
				quantity: 1 // Start with 1 seat
			}
		],
		metadata: {
			teamId,
			teamName
		},
		subscription_data: {
			metadata: {
				teamId,
				teamName
			}
		},
		success_url: successUrl,
		cancel_url: cancelUrl,
		allow_promotion_codes: true
	});

	return session;
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 */
export async function createPortalSession(customerId: string, returnUrl: string) {
	const session = await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: returnUrl
	});

	return session;
}

/**
 * Update subscription seat count
 */
export async function updateSubscriptionSeats(subscriptionId: string, seats: number) {
	const subscription = await stripe.subscriptions.retrieve(subscriptionId);

	if (!subscription.items.data[0]) {
		throw new Error('Subscription has no items');
	}

	const updated = await stripe.subscriptions.update(subscriptionId, {
		items: [
			{
				id: subscription.items.data[0].id,
				quantity: seats
			}
		],
		proration_behavior: 'always_invoice'
	});

	return updated;
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
	const subscription = await stripe.subscriptions.update(subscriptionId, {
		cancel_at_period_end: true
	});

	return subscription;
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(subscriptionId: string) {
	const subscription = await stripe.subscriptions.update(subscriptionId, {
		cancel_at_period_end: false
	});

	return subscription;
}
