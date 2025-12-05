/**
 * Pricing constants for QA Studio
 * Single source of truth for all pricing information
 *
 * Pro plan is priced per seat:
 * - $10/month per seat
 * - $100/year per seat (same as monthly, no discount on annual)
 *
 * Enterprise plan is custom pricing (contact sales)
 */

export const PRICING = {
	FREE: {
		name: 'Free',
		price: 0,
		pricePerSeatMonthly: 0,
		pricePerSeatYearly: 0,
		includedSeats: 1,
		maxProjects: 1,
		description: 'Perfect for individuals getting started',
		tagline: 'Get started for free',
		features: [
			'1 user (you)',
			'1 project',
			'Basic test management',
			'7-day attachment retention',
			'Community support'
		]
	},
	PRO: {
		name: 'Pro',
		pricePerSeatMonthly: 10,
		pricePerSeatYearly: 100, // $100/year per seat
		includedSeats: 10,
		maxProjects: -1, // Unlimited
		description: 'For teams that ship fast',
		tagline: 'Most popular',
		features: [
			'Up to 10 team members',
			'Unlimited projects',
			'Advanced test management',
			'30-day attachment retention',
			'AI-powered failure analysis',
			'Priority support',
			'Custom integrations'
		]
	},
	ENTERPRISE: {
		name: 'Enterprise',
		priceDisplay: 'Custom',
		description: 'For organizations with advanced needs',
		tagline: 'Contact sales',
		contactSales: true,
		features: [
			'Unlimited team members',
			'Unlimited projects',
			'Everything in Pro, plus:',
			'SSO/SAML authentication',
			'Advanced user permissions',
			'Audit logs',
			'SLA guarantees',
			'Dedicated support',
			'Custom contract terms',
			'On-premise deployment options'
		]
	}
} as const;

/**
 * Calculate monthly equivalent for yearly pricing
 */
export function getMonthlyEquivalent(plan: 'free' | 'pro' | 'enterprise'): number {
	if (plan === 'free' || plan === 'enterprise') return 0;
	return PRICING.PRO.pricePerSeatYearly / 12;
}

/**
 * Calculate total cost for a plan
 */
export function calculatePlanCost(
	plan: 'free' | 'pro' | 'enterprise',
	seats: number,
	period: 'monthly' | 'yearly'
): number {
	if (plan === 'free' || plan === 'enterprise') return 0;

	const pricePerSeat =
		period === 'monthly' ? PRICING.PRO.pricePerSeatMonthly : PRICING.PRO.pricePerSeatYearly;

	return pricePerSeat * seats;
}

/**
 * Format price for display
 */
export function formatPrice(
	price: number,
	period: 'month' | 'year' = 'month',
	perSeat: boolean = false
): string {
	const periodText = perSeat ? `${period}/seat` : period;
	return `$${price}/${periodText}`;
}

/**
 * Get plan limits
 */
export function getPlanLimits(plan: 'free' | 'pro' | 'enterprise') {
	if (plan === 'enterprise') {
		return {
			seats: -1, // Unlimited
			attachmentRetention: -1, // Unlimited
			aiAnalysis: true,
			sso: true,
			auditLogs: true,
			sla: true
		};
	}

	const planData = plan === 'free' ? PRICING.FREE : PRICING.PRO;
	return {
		seats: planData.includedSeats,
		attachmentRetention: plan === 'free' ? 7 : 30,
		aiAnalysis: plan === 'pro',
		sso: false,
		auditLogs: false,
		sla: false
	};
}
