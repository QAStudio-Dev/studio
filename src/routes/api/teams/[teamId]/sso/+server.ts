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
import {
	isValidProviderName,
	type ProviderName,
	clearTeamProviderCache
} from '$lib/server/oidc/registry';

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

		// Validate issuer URL format
		try {
			const issuerUrl = new URL(ssoIssuer);
			// Require HTTPS in production
			if (process.env.NODE_ENV === 'production' && issuerUrl.protocol !== 'https:') {
				throw error(400, 'Issuer URL must use HTTPS in production');
			}
			// Ensure it's a valid HTTP/HTTPS URL
			if (issuerUrl.protocol !== 'http:' && issuerUrl.protocol !== 'https:') {
				throw error(400, 'Issuer URL must be a valid HTTP or HTTPS URL');
			}
		} catch (err) {
			if ((err as any)?.status === 400) {
				throw err; // Re-throw our validation errors
			}
			throw error(400, 'Invalid issuer URL format');
		}

		// Validate SSO domains
		if (ssoDomains && Array.isArray(ssoDomains)) {
			// Prevent overly broad top-level domains
			const broadTLDs = ['com', 'org', 'net', 'io', 'co', 'edu', 'gov', 'mil'];

			for (const domain of ssoDomains) {
				// Check for empty or non-string values
				if (!domain || typeof domain !== 'string') {
					throw error(400, 'All SSO domains must be non-empty strings');
				}

				// Validate domain format (basic check for valid domain structure)
				// Must have at least one dot and valid characters
				if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
					throw error(400, `Invalid domain format: ${domain}`);
				}

				// Prevent use of overly broad TLDs
				if (broadTLDs.includes(domain.toLowerCase())) {
					throw error(
						400,
						`Cannot use top-level domain as SSO domain: ${domain}. Use a specific domain like example.${domain}`
					);
				}

				// Prevent domains with too few parts (e.g., just ".com")
				const parts = domain.split('.');
				if (parts.length < 2 || parts.some((part) => part.length === 0)) {
					throw error(400, `Invalid domain format: ${domain}`);
				}
			}
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

	// Clear cached provider instance to ensure new credentials are used
	clearTeamProviderCache(teamId);

	// Create audit log for SSO configuration change
	await db.auditLog.create({
		data: {
			action: 'SSO_CONFIG_UPDATED',
			userId,
			teamId,
			resourceType: 'Team',
			resourceId: teamId,
			metadata: {
				provider: ssoProvider,
				enabled: ssoEnabled,
				domainsCount: ssoDomains?.length || 0,
				credentialsUpdated: !!ssoClientSecret
			}
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

	// Clear cached provider instance
	clearTeamProviderCache(teamId);

	// Revoke all SSO sessions for this team
	// When SSO is disabled, existing SSO sessions should be invalidated for security
	const deletedSessions = await db.session.deleteMany({
		where: {
			user: {
				teamId,
				ssoProvider: { not: null } // Only delete SSO sessions, not password-based sessions
			}
		}
	});

	// Create audit log for SSO disablement
	await db.auditLog.create({
		data: {
			action: 'SSO_CONFIG_DISABLED',
			userId,
			teamId,
			resourceType: 'Team',
			resourceId: teamId,
			metadata: {
				message: 'SSO has been disabled for this team',
				sessionsRevoked: deletedSessions.count
			}
		}
	});

	return json({
		success: true,
		message: 'SSO disabled for team',
		sessionsRevoked: deletedSessions.count
	});
};
