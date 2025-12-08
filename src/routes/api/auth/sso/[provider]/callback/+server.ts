/**
 * SSO Callback Endpoint
 *
 * GET /api/auth/sso/{provider}/callback
 *
 * Handles OIDC callback after user authenticates with SSO provider.
 * Exchanges authorization code for tokens, verifies ID token, and creates session.
 */

import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProvider, isValidProviderName } from '$lib/server/oidc/registry';
import { db } from '$lib/server/db';
import { createSession, setSessionCookie } from '$lib/server/sessions';
import { timingSafeEqual } from 'crypto';

export const GET: RequestHandler = async ({ params, url, cookies }) => {
	const providerName = params.provider;

	// Validate provider
	if (!isValidProviderName(providerName)) {
		throw error(404, `Unknown SSO provider: ${providerName}`);
	}

	// Get teamId if it was stored during SSO initiation
	const teamId = cookies.get(`oauth_teamid_${providerName}`) || undefined;

	// Get provider instance (team-specific or global)
	const provider = await getProvider(providerName, teamId);
	if (!provider) {
		throw error(500, `${providerName.toUpperCase()} SSO is not configured`);
	}

	try {
		// Get callback parameters
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const errorParam = url.searchParams.get('error');
		const errorDescription = url.searchParams.get('error_description');

		// Check for error from provider
		if (errorParam) {
			console.error(`SSO error from ${providerName}:`, errorParam, errorDescription);
			throw redirect(
				302,
				`/login?error=${encodeURIComponent(errorDescription || errorParam)}`
			);
		}

		// Retrieve stored state and nonce from cookies
		const storedState = cookies.get(`oauth_state_${providerName}`);
		const storedNonce = cookies.get(`oauth_nonce_${providerName}`);

		// Verify state (CSRF protection) using constant-time comparison
		if (!state || !storedState) {
			console.error('CSRF validation failed - missing state');
			throw error(400, 'Invalid state parameter - possible CSRF attack');
		}

		// Check lengths match first (timingSafeEqual throws on different lengths)
		if (state.length !== storedState.length) {
			console.error('CSRF validation failed - state length mismatch');
			throw error(400, 'Invalid state parameter - possible CSRF attack');
		}

		// Use timing-safe comparison to prevent timing attacks
		const stateMatch = timingSafeEqual(
			Buffer.from(state, 'utf8'),
			Buffer.from(storedState, 'utf8')
		);

		if (!stateMatch) {
			console.error('CSRF validation failed - state mismatch');
			throw error(400, 'Invalid state parameter - possible CSRF attack');
		}

		if (!storedNonce) {
			console.error('Missing nonce - possible replay attack');
			throw error(400, 'Missing nonce');
		}

		if (!code) {
			throw error(400, 'No authorization code received');
		}

		// Exchange code for tokens and verify ID token
		const userInfo = await provider.handleCallback(code, storedNonce);

		// Extract user information
		const email = userInfo.email;
		if (!email) {
			throw error(400, 'No email provided by SSO provider');
		}

		// Validate and sanitize user data from SSO provider (prevent DB errors from long values)
		const firstName = (userInfo.given_name || '').substring(0, 100).trim();
		const lastName = (userInfo.family_name || '').substring(0, 100).trim();
		const imageUrl = userInfo.picture?.substring(0, 500) || null;
		const ssoProviderId = userInfo.sub?.substring(0, 255);

		if (!ssoProviderId) {
			throw error(400, 'No subject (sub) claim in ID token');
		}

		// Validate team ownership if teamId cookie exists (prevent cookie manipulation)
		if (teamId) {
			const domain = email.split('@')[1];
			if (domain) {
				const teamOwnsEmail = await db.team.findFirst({
					where: {
						id: teamId,
						ssoEnabled: true,
						ssoDomains: {
							has: domain
						}
					},
					select: { id: true }
				});

				if (!teamOwnsEmail) {
					console.error(
						`Team cookie manipulation detected: teamId=${teamId} does not own domain ${domain}`
					);
					throw error(403, 'Invalid team association');
				}
			}
		}

		// Find or create user
		let user = await db.user.findUnique({
			where: { email }
		});

		if (!user) {
			// Auto-provision new user
			// If teamId is provided, associate user with that team
			user = await db.user.create({
				data: {
					email,
					firstName,
					lastName,
					imageUrl,
					emailVerified: userInfo.email_verified ?? true,
					passwordHash: null, // SSO users don't need passwords
					role: 'TESTER', // Default role - customize based on your needs
					ssoProvider: providerName,
					ssoProviderId,
					teamId: teamId || null // Associate with team if SSO was team-specific
				}
			});

			console.log(
				`Auto-provisioned new user from ${providerName} SSO: ${email}${teamId ? ` (team: ${teamId})` : ''}`
			);
		} else if (!user.ssoProvider) {
			// Link existing password-based user to SSO
			user = await db.user.update({
				where: { id: user.id },
				data: {
					ssoProvider: providerName,
					ssoProviderId,
					emailVerified: true
				}
			});

			console.log(`Linked existing user to ${providerName} SSO: ${email}`);
		} else if (user.ssoProvider !== providerName || user.ssoProviderId !== ssoProviderId) {
			// User exists but with different SSO provider/ID
			console.error(
				`User ${email} tried to login with ${providerName} but is linked to ${user.ssoProvider}`
			);
			throw error(
				400,
				`This email is already linked to a different login method. Please use your original login method.`
			);
		}

		// Create session using existing session management
		const { sessionId, token, csrfToken } = await createSession(user.id);

		// Set session cookies
		setSessionCookie({ cookies } as any, sessionId, token, csrfToken);

		// Clean up temporary OAuth cookies
		cookies.delete(`oauth_state_${providerName}`, { path: '/' });
		cookies.delete(`oauth_nonce_${providerName}`, { path: '/' });
		if (teamId) {
			cookies.delete(`oauth_teamid_${providerName}`, { path: '/' });
		}

		// Redirect to home page
		throw redirect(302, '/');
	} catch (err) {
		console.error(`SSO callback error (${providerName}):`, err);

		// Re-throw SvelteKit errors (redirect, error)
		if (err instanceof Error && (err.message.includes('redirect') || 'status' in err)) {
			throw err;
		}

		// Log and redirect to login with error
		const errorMessage =
			err instanceof Error ? err.message : 'Authentication failed. Please try again.';
		throw redirect(302, `/login?error=${encodeURIComponent(errorMessage)}`);
	}
};
