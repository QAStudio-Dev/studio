/**
 * OIDC Provider Registry
 *
 * Centralized configuration for all SSO providers.
 * Supports both environment variable config (global) and database config (per-team).
 */

import { OIDCProvider, type OIDCConfig } from './provider';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { decrypt } from '$lib/server/encryption';

/**
 * Provider names (used in URLs and database)
 */
export type ProviderName = 'okta' | 'google';

/**
 * Get base URL for callbacks
 */
function getBaseUrl(): string {
	return env.PUBLIC_BASE_URL || 'http://localhost:5173';
}

/**
 * Provider configurations
 */
const providerConfigs: Record<ProviderName, () => OIDCConfig | null> = {
	okta: () => {
		const clientId = env.OKTA_CLIENT_ID;
		const clientSecret = env.OKTA_CLIENT_SECRET;
		const issuer = env.OKTA_ISSUER;

		if (!clientId || !clientSecret || !issuer) {
			console.warn('Okta SSO is not configured - missing environment variables');
			return null;
		}

		return {
			clientId,
			clientSecret,
			issuer,
			redirectUri: `${getBaseUrl()}/api/auth/sso/okta/callback`
		};
	},

	google: () => {
		const clientId = env.GOOGLE_CLIENT_ID;
		const clientSecret = env.GOOGLE_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			console.warn('Google SSO is not configured - missing environment variables');
			return null;
		}

		return {
			clientId,
			clientSecret,
			issuer: 'https://accounts.google.com',
			redirectUri: `${getBaseUrl()}/api/auth/sso/google/callback`
		};
	}
};

/**
 * Provider instances (lazy-loaded, keyed by "name" for env config or "teamId:name" for team config)
 */
const providerInstances: Map<string, OIDCProvider> = new Map();

/**
 * Get team-specific SSO configuration from database
 *
 * @param teamId - Team ID
 * @param providerName - Provider name to filter by (optional)
 * @returns OIDC config or null if not configured
 */
async function getTeamSSOConfig(
	teamId: string,
	providerName?: ProviderName
): Promise<OIDCConfig | null> {
	const team = await db.team.findUnique({
		where: { id: teamId },
		select: {
			ssoEnabled: true,
			ssoProvider: true,
			ssoClientId: true,
			ssoClientSecret: true,
			ssoIssuer: true
		}
	});

	if (!team || !team.ssoEnabled || !team.ssoProvider) {
		return null;
	}

	// If provider name specified, check it matches
	if (providerName && team.ssoProvider !== providerName) {
		return null;
	}

	// Validate required fields
	if (!team.ssoClientId || !team.ssoClientSecret || !team.ssoIssuer) {
		console.warn(`Team ${teamId} has incomplete SSO configuration`);
		return null;
	}

	// Decrypt client secret
	const clientSecret = decrypt(team.ssoClientSecret);

	return {
		clientId: team.ssoClientId,
		clientSecret,
		issuer: team.ssoIssuer,
		redirectUri: `${getBaseUrl()}/api/auth/sso/${team.ssoProvider}/callback`
	};
}

/**
 * Get OIDC provider instance
 *
 * @param name - Provider name (okta, google)
 * @param teamId - Optional team ID for team-specific SSO config
 * @returns OIDC provider instance or null if not configured
 */
export async function getProvider(
	name: ProviderName,
	teamId?: string
): Promise<OIDCProvider | null> {
	// If teamId provided, try to get team-specific config first
	if (teamId) {
		const cacheKey = `${teamId}:${name}`;

		// Return cached instance if exists
		if (providerInstances.has(cacheKey)) {
			return providerInstances.get(cacheKey)!;
		}

		// Try to get team config
		const teamConfig = await getTeamSSOConfig(teamId, name);
		if (teamConfig) {
			// Create and cache instance
			const provider = new OIDCProvider(teamConfig);
			providerInstances.set(cacheKey, provider);
			return provider;
		}

		// Fall through to env config if team config not found
	}

	// Use environment variable config (global)
	const cacheKey = name;

	// Return cached instance if exists
	if (providerInstances.has(cacheKey)) {
		return providerInstances.get(cacheKey)!;
	}

	// Get configuration from env
	const config = providerConfigs[name]();
	if (!config) {
		return null;
	}

	// Create and cache instance
	const provider = new OIDCProvider(config);
	providerInstances.set(cacheKey, provider);
	return provider;
}

/**
 * Check if provider is configured
 *
 * @param name - Provider name
 * @returns True if provider has valid configuration
 */
export function isProviderConfigured(name: ProviderName): boolean {
	return providerConfigs[name]() !== null;
}

/**
 * Get all configured providers
 *
 * @returns Array of configured provider names
 */
export function getConfiguredProviders(): ProviderName[] {
	return (Object.keys(providerConfigs) as ProviderName[]).filter(isProviderConfigured);
}

/**
 * Validate provider name
 *
 * @param name - String to validate
 * @returns True if valid provider name
 */
export function isValidProviderName(name: string): name is ProviderName {
	return name === 'okta' || name === 'google';
}

/**
 * Get team SSO configuration by email domain
 * Used for auto-detecting which SSO provider to use based on user's email
 *
 * @param email - User's email address
 * @returns Team SSO config or null if no matching domain found
 */
export async function getTeamByEmailDomain(
	email: string
): Promise<{ teamId: string; provider: ProviderName } | null> {
	// Validate email format before processing (prevent crashes on malformed input)
	if (!email || typeof email !== 'string') {
		return null;
	}

	// Basic email format validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return null;
	}

	const parts = email.split('@');
	if (parts.length !== 2) {
		return null;
	}

	const domain = parts[1];
	if (!domain) {
		return null;
	}

	// Find team with SSO enabled and matching domain
	const team = await db.team.findFirst({
		where: {
			ssoEnabled: true,
			ssoDomains: {
				has: domain
			}
		},
		select: {
			id: true,
			ssoProvider: true
		}
	});

	if (!team || !team.ssoProvider || !isValidProviderName(team.ssoProvider)) {
		return null;
	}

	return {
		teamId: team.id,
		provider: team.ssoProvider as ProviderName
	};
}
