/**
 * SSO Initiation Endpoint
 *
 * GET /api/auth/sso/{provider}?teamId=xxx (optional)
 *
 * Initiates OIDC authorization flow by redirecting to SSO provider.
 * Supports: okta, google
 * If teamId is provided, uses team-specific SSO configuration.
 */

import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProvider, isValidProviderName } from '$lib/server/oidc/registry';
import { generateToken } from '$lib/server/crypto';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ params, url, cookies }) => {
	const providerName = params.provider;
	const teamId = url.searchParams.get('teamId') || undefined;

	// Validate provider
	if (!isValidProviderName(providerName)) {
		throw error(404, `Unknown SSO provider: ${providerName}`);
	}

	// Get provider instance (team-specific or global)
	const provider = await getProvider(providerName, teamId);
	if (!provider) {
		throw error(
			500,
			`${providerName.toUpperCase()} SSO is not configured. Please set environment variables or configure team SSO.`
		);
	}

	try {
		// Generate CSRF state token (32 bytes = 256 bits of entropy)
		const state = generateToken(32);

		// Generate nonce for replay attack protection
		const nonce = generateToken(32);

		// Store state and nonce in HTTP-only cookies (expires in 10 minutes)
		const cookieOptions = {
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax' as const,
			maxAge: 60 * 10, // 10 minutes
			path: '/'
		};

		cookies.set(`oauth_state_${providerName}`, state, cookieOptions);
		cookies.set(`oauth_nonce_${providerName}`, nonce, cookieOptions);

		// Store teamId if provided (for callback)
		if (teamId) {
			cookies.set(`oauth_teamid_${providerName}`, teamId, cookieOptions);
		}

		// Get authorization URL from provider
		const authUrl = await provider.getAuthorizationUrl(state, nonce);

		// Redirect user to SSO provider
		throw redirect(302, authUrl);
	} catch (err) {
		console.error(`SSO initiation error (${providerName}):`, err);

		if (err instanceof Error && err.message.includes('redirect')) {
			throw err; // Re-throw redirect errors
		}

		throw error(500, `Failed to initiate ${providerName.toUpperCase()} SSO`);
	}
};
