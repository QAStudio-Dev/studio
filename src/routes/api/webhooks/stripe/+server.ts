import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { FREE_TIER_LIMITS } from '$lib/constants';
import type Stripe from 'stripe';
import { deleteCache, CacheKeys } from '$lib/server/redis';

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

				// Extract period dates from subscription object
				const subscriptionItem = subscription.items.data[0];
				// Note: TypeScript definitions may not include these, but they exist in Stripe's API
				const subData = subscription as any;
				const currentPeriodStart = subData.current_period_start
					? new Date(subData.current_period_start * 1000)
					: null;
				const currentPeriodEnd = subData.current_period_end
					? new Date(subData.current_period_end * 1000)
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

				// Update subscription and team status atomically to prevent race conditions
				// Use interactive transaction with appropriate isolation level
				await db.$transaction(
					async (tx) => {
						// Update subscription
						await tx.subscription.upsert({
							where: { stripeSubscriptionId: subscription.id },
							update: subscriptionData,
							create: {
								teamId,
								stripeCustomerId: subscription.customer as string,
								stripeSubscriptionId: subscription.id,
								...subscriptionData
							}
						});

						// Lock the team row and count members in a single query to prevent race conditions
						// This uses a raw query with SELECT FOR UPDATE to ensure exclusive lock
						const result = await tx.$queryRaw<
							Array<{ memberCount: number; overSeatLimit: boolean }>
						>`
							SELECT
								(SELECT COUNT(*)::int FROM "User" WHERE "teamId" = ${teamId}) as "memberCount",
								"overSeatLimit"
							FROM "Team"
							WHERE id = ${teamId}
							FOR UPDATE
						`;

						if (result.length > 0) {
							const { memberCount, overSeatLimit } = result[0];
							const newSeats = subscriptionItem?.quantity || 1;
							const isOverLimit = memberCount > newSeats;

							// Update team's overSeatLimit flag if it changed
							if (overSeatLimit !== isOverLimit) {
								await tx.team.update({
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
					},
					{
						isolationLevel: 'ReadCommitted' // Prevent dirty reads while allowing concurrent updates
					}
				);

				// Invalidate team status cache after transaction completes
				await deleteCache(CacheKeys.teamStatus(teamId));

				console.log(`✅ Subscription ${event.type} for team ${teamId}: ${status}`);

				break;
			}

			// Subscription deleted
			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;

				let teamId: string | undefined;

				// Update subscription status and check if team is now over free tier limit
				await db.$transaction(
					async (tx) => {
						// Update subscription to CANCELED and get team ID
						const updatedSub = await tx.subscription.update({
							where: { stripeSubscriptionId: subscription.id },
							data: {
								status: 'CANCELED'
							},
							select: {
								teamId: true
							}
						});

						teamId = updatedSub.teamId;

						// Lock the team row and count members in a single query to prevent race conditions
						const result = await tx.$queryRaw<
							Array<{ memberCount: number; overSeatLimit: boolean }>
						>`
							SELECT
								(SELECT COUNT(*)::int FROM "User" WHERE "teamId" = ${teamId}) as "memberCount",
								"overSeatLimit"
							FROM "Team"
							WHERE id = ${teamId}
							FOR UPDATE
						`;

						// When subscription is canceled, team reverts to free tier
						if (result.length > 0) {
							const { memberCount, overSeatLimit } = result[0];
							const isOverLimit = memberCount > FREE_TIER_LIMITS.MEMBERS;

							if (overSeatLimit !== isOverLimit) {
								await tx.team.update({
									where: { id: teamId },
									data: { overSeatLimit: isOverLimit }
								});

								if (isOverLimit) {
									console.warn(
										`⚠️ Team ${teamId} is now over free tier limit: ${memberCount} members, ${FREE_TIER_LIMITS.MEMBERS} allowed`
									);
									// TODO: Send email notification to team admins when email system is implemented
									// Notify: "Your subscription was canceled and your team has {memberCount} members but the free tier only allows {FREE_TIER_LIMITS.MEMBERS}. Please remove members or resubscribe."
								}
							}
						}
					},
					{
						isolationLevel: 'ReadCommitted'
					}
				);

				// Invalidate team status cache after transaction completes
				if (teamId) {
					await deleteCache(CacheKeys.teamStatus(teamId));
				}

				console.log(`✅ Subscription canceled: ${subscription.id}`);
				break;
			}

			// Invoice payment succeeded
			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as Stripe.Invoice;

				// Extract subscription ID from invoice
				// Note: invoice.subscription can be either a string ID or an expanded Subscription object
				const subscriptionId =
					typeof (invoice as any).subscription === 'string'
						? (invoice as any).subscription
						: (invoice as any).subscription?.id || null;

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

				// Extract subscription ID from invoice
				// Note: invoice.subscription can be either a string ID or an expanded Subscription object
				const subscriptionId =
					typeof (invoice as any).subscription === 'string'
						? (invoice as any).subscription
						: (invoice as any).subscription?.id || null;

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
