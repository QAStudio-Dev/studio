/**
 * AI Analysis Quota Management
 *
 * Handles quota checking and usage tracking for AI trace analysis feature.
 * - Free tier: 10 analyses per month
 * - Pro tier: Unlimited analyses
 * - Self-hosted: Unlimited analyses
 */

import { db } from './db';
import { DEPLOYMENT_CONFIG } from '$lib/config';

export interface QuotaCheckResult {
	allowed: boolean;
	limit: number; // -1 = unlimited
	used: number;
	message?: string;
}

const FREE_TIER_LIMIT = 10;

/**
 * Check if team has remaining AI analysis quota
 */
export async function checkAIAnalysisQuota(
	teamId: string,
	subscription: any
): Promise<QuotaCheckResult> {
	// Self-hosted deployments have unlimited AI analysis
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return {
			allowed: true,
			limit: -1, // -1 = unlimited
			used: 0
		};
	}

	// Check if team has active subscription
	const hasActiveSubscription =
		subscription && (subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE');

	if (hasActiveSubscription) {
		// Unlimited for pro users
		return {
			allowed: true,
			limit: -1, // -1 = unlimited
			used: subscription.aiAnalysisCount || 0
		};
	}

	// Free tier - check monthly quota
	const now = new Date();
	const resetAt = subscription?.aiAnalysisResetAt;

	// Reset counter if it's a new month (use UTC to avoid timezone issues)
	const shouldReset =
		!resetAt ||
		resetAt.getUTCMonth() !== now.getUTCMonth() ||
		resetAt.getUTCFullYear() !== now.getUTCFullYear();

	if (shouldReset) {
		// Reset the counter for the new month
		// Use updateMany with conditional where clause to prevent race condition
		if (subscription) {
			const updated = await db.subscription.updateMany({
				where: {
					id: subscription.id,
					// Only reset if the resetAt hasn't been updated by another request
					OR: [
						{ aiAnalysisResetAt: null },
						{
							aiAnalysisResetAt: {
								lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
							}
						}
					]
				},
				data: {
					aiAnalysisCount: 0,
					aiAnalysisResetAt: now
				}
			});

			// If we didn't update (another request already did), re-fetch the subscription
			if (updated.count === 0) {
				const refreshedSubscription = await db.subscription.findUnique({
					where: { id: subscription.id }
				});
				if (refreshedSubscription) {
					// Return the current state after another request reset it
					return {
						allowed: refreshedSubscription.aiAnalysisCount < FREE_TIER_LIMIT,
						limit: FREE_TIER_LIMIT,
						used: refreshedSubscription.aiAnalysisCount
					};
				}
			}
		}

		return {
			allowed: true,
			limit: FREE_TIER_LIMIT,
			used: 0
		};
	}

	const currentUsage = subscription?.aiAnalysisCount || 0;

	if (currentUsage >= FREE_TIER_LIMIT) {
		return {
			allowed: false,
			limit: FREE_TIER_LIMIT,
			used: currentUsage,
			message: `Free tier limit of ${FREE_TIER_LIMIT} AI analyses per month exceeded. Upgrade to Pro for unlimited analyses.`
		};
	}

	return {
		allowed: true,
		limit: FREE_TIER_LIMIT,
		used: currentUsage
	};
}

/**
 * Increment AI analysis usage counter
 */
export async function incrementAIAnalysisUsage(teamId: string, subscription: any): Promise<void> {
	// Self-hosted deployments don't track usage
	if (DEPLOYMENT_CONFIG.IS_SELF_HOSTED) {
		return;
	}

	if (!subscription) {
		// Create subscription record if it doesn't exist (for free teams)
		// This shouldn't normally happen but handle it gracefully
		console.warn(`Team ${teamId} has no subscription record, skipping usage increment`);
		return;
	}

	const hasActiveSubscription =
		subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE';

	// Only increment counter for free tier
	if (!hasActiveSubscription) {
		await db.subscription.update({
			where: { id: subscription.id },
			data: {
				aiAnalysisCount: { increment: 1 }
			}
		});
	}
}

/**
 * Check if a month boundary has been crossed (for testing)
 */
export function shouldResetQuota(
	resetAt: Date | null | undefined,
	now: Date = new Date()
): boolean {
	if (!resetAt) return true;

	// Use UTC to avoid timezone issues
	return (
		resetAt.getUTCMonth() !== now.getUTCMonth() ||
		resetAt.getUTCFullYear() !== now.getUTCFullYear()
	);
}
