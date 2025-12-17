import { Endpoint, z } from 'sveltekit-api';
import { DEPLOYMENT_CONFIG } from '$lib/config';

/**
 * Public configuration endpoint
 *
 * This endpoint is intentionally public (no authentication required) to allow
 * the frontend to determine deployment mode before user login. This helps:
 * - Show/hide billing UI on login/signup pages
 * - Display appropriate CTAs based on deployment mode
 * - Conditionally render pricing information
 *
 * Security note: Only returns non-sensitive deployment configuration.
 * Does NOT expose secrets, internal URLs, or detailed infrastructure info.
 */

// Define output schema
export const Output = z.object({
	selfHosted: z.boolean().describe('Whether this is a self-hosted deployment'),
	billing: z
		.object({
			enabled: z.boolean().describe('Whether billing/payment features are enabled')
		})
		.describe('Billing configuration')
});

// Add OpenAPI metadata
export const Modifier = (r: any) => {
	r.tags = ['Configuration'];
	r.summary = 'Get public deployment configuration';
	r.description =
		'Returns minimal deployment mode information (self-hosted vs SaaS) to help frontends conditionally render billing/pricing UI. This endpoint is public and does not require authentication.';
	return r;
};

// Implement handler
export default new Endpoint({ Output, Modifier }).handle(async (): Promise<any> => {
	const isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;

	return {
		selfHosted: isSelfHosted,
		billing: {
			enabled: !isSelfHosted // Billing only enabled in SaaS mode
		}
	};
});
