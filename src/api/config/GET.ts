import { Endpoint, z } from 'sveltekit-api';
import { DEPLOYMENT_CONFIG } from '$lib/config';

// Define output schema
export const Output = z.object({
	selfHosted: z.boolean().describe('Whether this is a self-hosted deployment'),
	features: z
		.object({
			ai_analysis: z.boolean().describe('AI-powered failure analysis available'),
			advanced_reports: z.boolean().describe('Advanced reporting available'),
			integrations: z.boolean().describe('Custom integrations available'),
			unlimited_users: z.boolean().describe('Unlimited user seats available'),
			unlimited_projects: z.boolean().describe('Unlimited projects available')
		})
		.describe('Available features in this deployment'),
	billing: z
		.object({
			enabled: z.boolean().describe('Whether billing/payment is enabled'),
			stripeConfigured: z.boolean().describe('Whether Stripe is configured')
		})
		.describe('Billing configuration')
});

// Add OpenAPI metadata
export const Modifier = (r: any) => {
	r.tags = ['Configuration'];
	r.summary = 'Get deployment configuration';
	r.description =
		'Returns deployment mode (self-hosted vs SaaS) and available features. Use this to conditionally show/hide billing and pricing UI elements.';
	return r;
};

// Implement handler
export default new Endpoint({ Output, Modifier }).handle(async (): Promise<any> => {
	const isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;
	const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.PUBLIC_STRIPE_KEY);

	return {
		selfHosted: isSelfHosted,
		features: {
			// In self-hosted mode, all features are always available
			// In SaaS mode, features depend on subscription (returned per-team, not globally)
			ai_analysis: isSelfHosted,
			advanced_reports: isSelfHosted,
			integrations: isSelfHosted,
			unlimited_users: isSelfHosted,
			unlimited_projects: true // Always true, even in SaaS mode
		},
		billing: {
			enabled: !isSelfHosted, // Billing only enabled in SaaS mode
			stripeConfigured: !isSelfHosted && stripeConfigured
		}
	};
});
