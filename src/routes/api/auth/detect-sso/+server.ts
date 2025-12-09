/**
 * SSO Auto-Detection API
 *
 * POST /api/auth/detect-sso
 *
 * Detects if a user's email domain has SSO configured.
 * Returns SSO provider info if found, or null if user should use password auth.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTeamByEmailDomain } from '$lib/server/oidc/registry';

export const POST: RequestHandler = async ({ request }) => {
	const { email } = await request.json();

	if (!email || typeof email !== 'string') {
		return json({ hasSso: false, provider: null, teamId: null });
	}

	// Check if email domain has SSO configured
	const teamSso = await getTeamByEmailDomain(email);

	if (!teamSso) {
		return json({ hasSso: false, provider: null, teamId: null });
	}

	return json({
		hasSso: true,
		provider: teamSso.provider,
		teamId: teamSso.teamId
	});
};
