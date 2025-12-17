import { Endpoint, z, error } from 'sveltekit-api';
import { DEPLOYMENT_CONFIG } from '$lib/config';
import { checkRateLimitWithInfo } from '$lib/server/rate-limit';

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
 *
 * Rate limiting: 100 requests per minute per IP address to prevent fingerprinting attacks.
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
		'Returns minimal deployment mode information (self-hosted vs SaaS) to help frontends conditionally render billing/pricing UI. This endpoint is public and does not require authentication. Rate limited to 100 requests per minute per IP.';
	return r;
};

// Implement handler
export default new Endpoint({ Output, Modifier }).handle(
	async (_input, evt): Promise<z.infer<typeof Output>> => {
		// Extract client IP for rate limiting
		const clientIP =
			evt.getClientAddress() ||
			evt.request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
			evt.request.headers.get('x-real-ip') ||
			'unknown';

		// Rate limit: 100 requests per minute per IP
		const rateLimitResult = await checkRateLimitWithInfo({
			key: `config:${clientIP}`,
			limit: 100,
			window: 60, // 60 seconds
			prefix: 'api'
		});

		// Check if rate limit exceeded (set headers even on error)
		if (!rateLimitResult.success) {
			evt.setHeaders({
				'X-RateLimit-Limit': rateLimitResult.limit.toString(),
				'X-RateLimit-Remaining': '0',
				'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString()
			});

			const resetDate = new Date(rateLimitResult.reset);
			throw error(429, `Rate limit exceeded. Try again after ${resetDate.toISOString()}`);
		}

		// Add rate limit headers for successful requests
		evt.setHeaders({
			'X-RateLimit-Limit': rateLimitResult.limit.toString(),
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString()
		});

		const isSelfHosted = DEPLOYMENT_CONFIG.IS_SELF_HOSTED;

		return {
			selfHosted: isSelfHosted,
			billing: {
				enabled: !isSelfHosted // Billing only enabled in SaaS mode
			}
		};
	}
);
