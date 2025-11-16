import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import type Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * Handles subscription lifecycle events
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		console.error('❌ Missing stripe-signature header');
		return json({ error: 'Missing signature' }, { status: 400 });
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
	} catch (err: any) {
		console.error('❌ Webhook signature verification failed:', err.message);
		return json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
	}

	console.log(`📨 Stripe webhook received: ${event.type}`);

	try {
		switch (event.type) {
			// Customer created
			case 'customer.created': {
				const customer = event.data.object as Stripe.Customer;
				console.log('✅ Customer created:', customer.id);
				break;
			}

			// Checkout session completed - subscription created
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				const teamId = session.metadata?.teamId;

				if (!teamId) {
					console.warn('⚠️ Checkout session missing teamId metadata');
					break;
				}

				// Create subscription record
				if (session.subscription && session.customer) {
					await db.subscription.create({
						data: {
							teamId,
							stripeCustomerId: session.customer as string,
							stripeSubscriptionId: session.subscription as string,
							stripePriceId: session.line_items?.data[0]?.price?.id || null,
							status: 'INCOMPLETE',
							seats: 1
						}
					});

					console.log(`✅ Subscription created for team ${teamId}`);
				}
				break;
			}

			// Subscription created/updated
			case 'customer.subscription.created':
			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription;
				const teamId = subscription.metadata?.teamId;

				if (!teamId) {
					console.warn('⚠️ Subscription missing teamId metadata');
					break;
				}

				// Map Stripe status to our enum
				const status = mapStripeStatus(subscription.status);

				// Extract period dates from the first subscription item
				// Stripe stores current_period_start/end in the subscription items, not the subscription itself
				const subscriptionItem = subscription.items.data[0];
				const itemData = subscriptionItem as any;
				const currentPeriodStart = itemData?.current_period_start
					? new Date(itemData.current_period_start * 1000)
					: null;
				const currentPeriodEnd = itemData?.current_period_end
					? new Date(itemData.current_period_end * 1000)
					: null;

				// Build update/create data
				const subscriptionData: any = {
					status,
					stripePriceId: subscriptionItem?.price?.id || null,
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					seats: subscriptionItem?.quantity || 1
				};

				// Only include period dates if they're valid
				if (currentPeriodStart) {
					subscriptionData.currentPeriodStart = currentPeriodStart;
				}
				if (currentPeriodEnd) {
					subscriptionData.currentPeriodEnd = currentPeriodEnd;
				}

				await db.subscription.upsert({
					where: { stripeSubscriptionId: subscription.id },
					update: subscriptionData,
					create: {
						teamId,
						stripeCustomerId: subscription.customer as string,
						stripeSubscriptionId: subscription.id,
						...subscriptionData
					}
				});

				console.log(`✅ Subscription ${event.type} for team ${teamId}: ${status}`);

				// Check if team is now over seat limit
				const team = await db.team.findUnique({
					where: { id: teamId },
					include: {
						members: true
					}
				});

				if (team) {
					const newSeats = subscriptionItem?.quantity || 1;
					const memberCount = team.members.length;
					const isOverLimit = memberCount > newSeats;

					// Update team's overSeatLimit flag
					if (team.overSeatLimit !== isOverLimit) {
						await db.team.update({
							where: { id: teamId },
							data: { overSeatLimit: isOverLimit }
						});

						if (isOverLimit) {
							console.warn(
								`⚠️ Team ${teamId} is over seat limit: ${memberCount} members, ${newSeats} seats`
							);
						} else {
							console.log(`✅ Team ${teamId} is now within seat limit`);
						}
					}
				}

				break;
			}

			// Subscription deleted
			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;

				await db.subscription.update({
					where: { stripeSubscriptionId: subscription.id },
					data: {
						status: 'CANCELED'
					}
				});

				console.log(`✅ Subscription canceled: ${subscription.id}`);
				break;
			}

			// Invoice payment succeeded
			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as Stripe.Invoice;

				// Extract subscription ID from parent subscription details
				const subscriptionId =
					invoice.parent?.type === 'subscription_details' &&
					invoice.parent.subscription_details?.subscription
						? typeof invoice.parent.subscription_details.subscription === 'string'
							? invoice.parent.subscription_details.subscription
							: invoice.parent.subscription_details.subscription.id
						: null;

				if (subscriptionId) {
					await db.subscription.update({
						where: { stripeSubscriptionId: subscriptionId },
						data: {
							status: 'ACTIVE'
						}
					});

					console.log(`✅ Payment succeeded for subscription: ${subscriptionId}`);
				}
				break;
			}

			// Invoice payment failed
			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice;

				// Extract subscription ID from parent subscription details
				const subscriptionId =
					invoice.parent?.type === 'subscription_details' &&
					invoice.parent.subscription_details?.subscription
						? typeof invoice.parent.subscription_details.subscription === 'string'
							? invoice.parent.subscription_details.subscription
							: invoice.parent.subscription_details.subscription.id
						: null;

				if (subscriptionId) {
					await db.subscription.update({
						where: { stripeSubscriptionId: subscriptionId },
						data: {
							status: 'PAST_DUE'
						}
					});

					console.log(`❌ Payment failed for subscription: ${subscriptionId}`);
				}
				break;
			}

			default:
				console.log(`ℹ️ Unhandled event type: ${event.type}`);
		}

		return json({ received: true });
	} catch (error: any) {
		console.error('❌ Webhook handler error:', error);
		return json({ error: error.message }, { status: 500 });
	}
};

/**
 * Map Stripe subscription status to our enum
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
	const statusMap: Record<Stripe.Subscription.Status, string> = {
		active: 'ACTIVE',
		past_due: 'PAST_DUE',
		canceled: 'CANCELED',
		incomplete: 'INCOMPLETE',
		incomplete_expired: 'INCOMPLETE_EXPIRED',
		trialing: 'ACTIVE', // No trials - treat as active
		unpaid: 'UNPAID',
		paused: 'CANCELED'
	};

	return statusMap[stripeStatus] || 'INCOMPLETE';
}
