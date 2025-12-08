/**
 * Team SSO Configuration API
 *
 * GET    /api/teams/:teamId/sso - Get team's SSO configuration
 * POST   /api/teams/:teamId/sso - Create/update team's SSO configuration
 * DELETE /api/teams/:teamId/sso - Disable team's SSO configuration
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { encrypt, decrypt } from '$lib/server/encryption';
import { isValidProviderName, type ProviderName } from '$lib/server/oidc/registry';

/**
 * Get team's SSO configuration (without exposing secrets)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	await requireAuth({ locals } as any);
	const teamId = params.teamId!;

	const team = await db.team.findUnique({
		where: { id: teamId },
		select: {
			id: true,
			name: true,
			ssoEnabled: true,
			ssoProvider: true,
			ssoClientId: true,
			ssoIssuer: true,
			ssoDomains: true
			// Note: NOT including ssoClientSecret
		}
	});

	if (!team) {
		throw error(404, 'Team not found');
	}

	return json({
		teamId: team.id,
		teamName: team.name,
		ssoEnabled: team.ssoEnabled,
		ssoProvider: team.ssoProvider,
		ssoClientId: team.ssoClientId,
		ssoIssuer: team.ssoIssuer,
		ssoDomains: team.ssoDomains
	});
};

/**
 * Create or update team's SSO configuration
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const userId = await requireAuth({ locals } as any);
	const teamId = params.teamId!;

	// Verify user belongs to this team and has appropriate role
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true, role: true }
	});

	if (user?.teamId !== teamId || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
		throw error(403, 'Only team admins can configure SSO');
	}

	const body = await request.json();
	const { ssoEnabled, ssoProvider, ssoClientId, ssoClientSecret, ssoIssuer, ssoDomains } = body;

	// Validate provider
	if (ssoProvider && !isValidProviderName(ssoProvider)) {
		throw error(400, `Invalid SSO provider: ${ssoProvider}`);
	}

	// Validate required fields if SSO is enabled
	if (ssoEnabled) {
		if (!ssoProvider || !ssoClientId || !ssoClientSecret || !ssoIssuer) {
			throw error(
				400,
				'When enabling SSO, provider, clientId, clientSecret, and issuer are required'
			);
		}
	}

	// Encrypt client secret before storing
	const encryptedSecret = ssoClientSecret ? encrypt(ssoClientSecret) : null;

	// Update team SSO configuration
	const updatedTeam = await db.team.update({
		where: { id: teamId },
		data: {
			ssoEnabled: ssoEnabled ?? false,
			ssoProvider: ssoProvider as ProviderName | null,
			ssoClientId,
			ssoClientSecret: encryptedSecret,
			ssoIssuer,
			ssoDomains: ssoDomains || []
		},
		select: {
			id: true,
			name: true,
			ssoEnabled: true,
			ssoProvider: true,
			ssoClientId: true,
			ssoIssuer: true,
			ssoDomains: true
		}
	});

	return json({
		success: true,
		teamId: updatedTeam.id,
		teamName: updatedTeam.name,
		ssoEnabled: updatedTeam.ssoEnabled,
		ssoProvider: updatedTeam.ssoProvider,
		ssoClientId: updatedTeam.ssoClientId,
		ssoIssuer: updatedTeam.ssoIssuer,
		ssoDomains: updatedTeam.ssoDomains
	});
};

/**
 * Disable team's SSO configuration
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userId = await requireAuth({ locals } as any);
	const teamId = params.teamId!;

	// Verify user belongs to this team and has appropriate role
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true, role: true }
	});

	if (user?.teamId !== teamId || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
		throw error(403, 'Only team admins can configure SSO');
	}

	// Disable SSO
	await db.team.update({
		where: { id: teamId },
		data: {
			ssoEnabled: false,
			ssoProvider: null,
			ssoClientId: null,
			ssoClientSecret: null,
			ssoIssuer: null,
			ssoDomains: []
		}
	});

	return json({ success: true, message: 'SSO disabled for team' });
};
