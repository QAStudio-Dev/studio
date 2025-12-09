/**
 * Minimal OIDC (OpenID Connect) Provider Implementation
 *
 * Zero external auth dependencies - uses only Node.js built-in crypto.
 * Implements the Authorization Code Flow for enterprise SSO.
 */

import { verifyJWT, fetchJWKS, type JWTPayload } from './jwt';

/**
 * OIDC Discovery document structure
 */
interface OIDCDiscovery {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	jwks_uri: string;
	userinfo_endpoint?: string;
	end_session_endpoint?: string;
}

/**
 * OIDC Provider Configuration
 */
export interface OIDCConfig {
	clientId: string;
	clientSecret: string;
	issuer: string; // e.g., https://your-domain.okta.com/oauth2/default
	redirectUri: string; // e.g., https://yourdomain.com/api/auth/sso/okta/callback
}

/**
 * Token response from OIDC provider
 */
interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	id_token: string;
	refresh_token?: string;
	scope?: string;
}

/**
 * Shared JWKS cache entry
 */
interface JWKSCacheEntry {
	keys: any[];
	timestamp: number;
}

/**
 * Global JWKS cache shared across all provider instances
 * Keyed by issuer URL to avoid duplicate fetches for same provider
 * This is particularly important for multi-tenant SSO where multiple teams may use the same provider
 */
const globalJWKSCache = new Map<string, JWKSCacheEntry>();

/**
 * OIDC Provider Client
 *
 * Handles the full OIDC Authorization Code Flow:
 * 1. Discovery: Fetch provider configuration
 * 2. Authorization: Generate authorization URL
 * 3. Token Exchange: Exchange authorization code for tokens
 * 4. Verification: Verify and decode ID token
 */
export class OIDCProvider {
	private config: OIDCConfig;
	private discoveryCache: OIDCDiscovery | null = null;
	private readonly JWKS_CACHE_TTL = 3600000; // 1 hour in milliseconds

	constructor(config: OIDCConfig) {
		this.config = config;
	}

	/**
	 * Fetch and cache OIDC discovery document
	 *
	 * Discovery endpoint: {issuer}/.well-known/openid-configuration
	 */
	async discover(): Promise<OIDCDiscovery> {
		if (this.discoveryCache) {
			return this.discoveryCache;
		}

		const discoveryUrl = `${this.config.issuer}/.well-known/openid-configuration`;
		const response = await fetch(discoveryUrl);

		if (!response.ok) {
			throw new Error(`OIDC discovery failed: ${response.statusText}`);
		}

		const discovery = await response.json();
		this.discoveryCache = discovery;
		return discovery;
	}

	/**
	 * Generate authorization URL for login
	 *
	 * @param state - CSRF protection token
	 * @param nonce - Replay attack protection token
	 * @returns Authorization URL to redirect user to
	 */
	async getAuthorizationUrl(state: string, nonce: string): Promise<string> {
		const discovery = await this.discover();

		const params = new URLSearchParams({
			client_id: this.config.clientId,
			redirect_uri: this.config.redirectUri,
			response_type: 'code',
			scope: 'openid email profile',
			state,
			nonce
		});

		return `${discovery.authorization_endpoint}?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for tokens
	 *
	 * @param code - Authorization code from callback
	 * @returns Token response with access_token and id_token
	 */
	async exchangeCode(code: string): Promise<TokenResponse> {
		const discovery = await this.discover();

		// Create Basic Auth header
		const credentials = Buffer.from(
			`${this.config.clientId}:${this.config.clientSecret}`
		).toString('base64');

		const response = await fetch(discovery.token_endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${credentials}`
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				redirect_uri: this.config.redirectUri
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Token exchange failed: ${error}`);
		}

		return await response.json();
	}

	/**
	 * Fetch and cache JWKS (JSON Web Key Set)
	 * Uses global cache keyed by issuer to avoid duplicate fetches across provider instances
	 */
	private async getJWKS(): Promise<any[]> {
		const now = Date.now();
		const cacheKey = this.config.issuer;

		// Check global cache for this issuer
		const cached = globalJWKSCache.get(cacheKey);
		if (cached && now - cached.timestamp < this.JWKS_CACHE_TTL) {
			return cached.keys;
		}

		// Fetch fresh JWKS
		const discovery = await this.discover();
		const keys = await fetchJWKS(discovery.jwks_uri);

		// Store in global cache
		globalJWKSCache.set(cacheKey, { keys, timestamp: now });

		return keys;
	}

	/**
	 * Verify and decode ID token
	 *
	 * @param idToken - ID token from token response
	 * @param nonce - Nonce used in authorization request
	 * @returns Decoded and verified JWT payload with user info
	 */
	async verifyIdToken(idToken: string, nonce: string): Promise<JWTPayload> {
		const jwks = await this.getJWKS();

		return verifyJWT(idToken, jwks, {
			issuer: this.config.issuer,
			audience: this.config.clientId,
			nonce
		});
	}

	/**
	 * Get user info from access token (optional - most data is in ID token)
	 *
	 * @param accessToken - Access token from token response
	 * @returns User information from userinfo endpoint
	 */
	async getUserInfo(accessToken: string): Promise<any> {
		const discovery = await this.discover();

		if (!discovery.userinfo_endpoint) {
			throw new Error('UserInfo endpoint not available');
		}

		const response = await fetch(discovery.userinfo_endpoint, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			throw new Error(`UserInfo request failed: ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Complete OIDC flow: exchange code and verify ID token
	 *
	 * Convenience method that combines code exchange and token verification.
	 *
	 * @param code - Authorization code from callback
	 * @param nonce - Nonce used in authorization request
	 * @returns Verified user information from ID token
	 */
	async handleCallback(code: string, nonce: string): Promise<JWTPayload> {
		// Exchange code for tokens
		const tokens = await this.exchangeCode(code);

		// Verify and decode ID token
		const userInfo = await this.verifyIdToken(tokens.id_token, nonce);

		return userInfo;
	}
}
