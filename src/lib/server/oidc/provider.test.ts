import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OIDCProvider } from './provider';
import type { OIDCConfig } from './provider';

describe('OIDCProvider', () => {
	let config: OIDCConfig;
	let provider: OIDCProvider;

	beforeEach(() => {
		config = {
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			issuer: 'https://test.okta.com/oauth2/default',
			redirectUri: 'https://example.com/callback'
		};

		provider = new OIDCProvider(config);

		// Reset fetch mock
		vi.restoreAllMocks();
	});

	describe('discover', () => {
		it('should fetch and cache OIDC discovery document', async () => {
			const mockDiscovery = {
				issuer: 'https://test.okta.com/oauth2/default',
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys',
				userinfo_endpoint: 'https://test.okta.com/oauth2/default/v1/userinfo'
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockDiscovery
			});

			const discovery = await provider.discover();

			expect(discovery).toEqual(mockDiscovery);
			expect(fetch).toHaveBeenCalledWith(
				'https://test.okta.com/oauth2/default/.well-known/openid-configuration'
			);
		});

		it('should cache discovery document on subsequent calls', async () => {
			const mockDiscovery = {
				issuer: 'https://test.okta.com/oauth2/default',
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys'
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockDiscovery
			});

			await provider.discover();
			await provider.discover();
			await provider.discover();

			// Should only fetch once due to caching
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it('should throw on discovery failure', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: 'Not Found'
			});

			await expect(provider.discover()).rejects.toThrow('OIDC discovery failed: Not Found');
		});
	});

	describe('getAuthorizationUrl', () => {
		it('should generate correct authorization URL', async () => {
			const mockDiscovery = {
				issuer: config.issuer,
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys'
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockDiscovery
			});

			const state = 'random-state-token';
			const nonce = 'random-nonce-token';

			const authUrl = await provider.getAuthorizationUrl(state, nonce);

			expect(authUrl).toContain('https://test.okta.com/oauth2/default/v1/authorize');
			expect(authUrl).toContain(`client_id=${config.clientId}`);
			expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(config.redirectUri)}`);
			expect(authUrl).toContain('response_type=code');
			expect(authUrl).toContain('scope=openid+email+profile');
			expect(authUrl).toContain(`state=${state}`);
			expect(authUrl).toContain(`nonce=${nonce}`);
		});
	});

	describe('exchangeCode', () => {
		it('should exchange authorization code for tokens', async () => {
			const mockDiscovery = {
				issuer: config.issuer,
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys'
			};

			const mockTokenResponse = {
				access_token: 'access-token-123',
				token_type: 'Bearer',
				expires_in: 3600,
				id_token: 'id-token-jwt',
				refresh_token: 'refresh-token-123'
			};

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockDiscovery
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockTokenResponse
				});

			const tokens = await provider.exchangeCode('auth-code-123');

			expect(tokens).toEqual(mockTokenResponse);

			// Verify token endpoint was called with correct parameters
			const tokenCall = (fetch as any).mock.calls[1];
			expect(tokenCall[0]).toBe('https://test.okta.com/oauth2/default/v1/token');

			const [, options] = tokenCall;
			expect(options.method).toBe('POST');
			expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
			expect(options.headers.Authorization).toContain('Basic ');

			const body = options.body.toString();
			expect(body).toContain('grant_type=authorization_code');
			expect(body).toContain('code=auth-code-123');
			expect(body).toContain(`redirect_uri=${encodeURIComponent(config.redirectUri)}`);
		});

		it('should throw on token exchange failure', async () => {
			const mockDiscovery = {
				issuer: config.issuer,
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys'
			};

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockDiscovery
				})
				.mockResolvedValueOnce({
					ok: false,
					text: async () => 'Invalid authorization code'
				});

			await expect(provider.exchangeCode('invalid-code')).rejects.toThrow(
				'Token exchange failed: Invalid authorization code'
			);
		});

		it('should use Basic Auth with client credentials', async () => {
			const mockDiscovery = {
				issuer: config.issuer,
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys'
			};

			const mockTokenResponse = {
				access_token: 'token',
				token_type: 'Bearer',
				expires_in: 3600,
				id_token: 'jwt'
			};

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockDiscovery
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockTokenResponse
				});

			await provider.exchangeCode('code');

			const tokenCall = (fetch as any).mock.calls[1];
			const authHeader = tokenCall[1].headers.Authorization;

			// Verify Basic Auth format
			expect(authHeader).toMatch(/^Basic /);

			// Verify credentials are base64 encoded
			const base64Creds = authHeader.replace('Basic ', '');
			const decodedCreds = Buffer.from(base64Creds, 'base64').toString();
			expect(decodedCreds).toBe(`${config.clientId}:${config.clientSecret}`);
		});
	});

	describe('getUserInfo', () => {
		it('should fetch user info with access token', async () => {
			const mockDiscovery = {
				issuer: config.issuer,
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys',
				userinfo_endpoint: 'https://test.okta.com/oauth2/default/v1/userinfo'
			};

			const mockUserInfo = {
				sub: 'user-123',
				email: 'user@example.com',
				name: 'Test User',
				given_name: 'Test',
				family_name: 'User'
			};

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockDiscovery
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockUserInfo
				});

			const userInfo = await provider.getUserInfo('access-token-123');

			expect(userInfo).toEqual(mockUserInfo);

			const userInfoCall = (fetch as any).mock.calls[1];
			expect(userInfoCall[1].headers.Authorization).toBe('Bearer access-token-123');
		});

		it('should throw if userinfo endpoint not available', async () => {
			const mockDiscovery = {
				issuer: config.issuer,
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys'
				// No userinfo_endpoint
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: async () => mockDiscovery
			});

			await expect(provider.getUserInfo('token')).rejects.toThrow(
				'UserInfo endpoint not available'
			);
		});
	});

	describe('JWKS caching', () => {
		it('should cache JWKS for 1 hour', async () => {
			const mockDiscovery = {
				issuer: config.issuer,
				authorization_endpoint: 'https://test.okta.com/oauth2/default/v1/authorize',
				token_endpoint: 'https://test.okta.com/oauth2/default/v1/token',
				jwks_uri: 'https://test.okta.com/oauth2/default/v1/keys'
			};

			const mockJwks = {
				keys: [
					{
						kty: 'RSA',
						kid: 'key-1',
						n: 'modulus',
						e: 'AQAB'
					}
				]
			};

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockDiscovery
				})
				.mockResolvedValue({
					ok: true,
					json: async () => mockJwks
				});

			// Access private method via any cast for testing
			const getJWKS = (provider as any).getJWKS.bind(provider);

			await getJWKS();
			await getJWKS();

			// Should fetch discovery once, then JWKS once (cached on second call)
			expect(fetch).toHaveBeenCalledTimes(2);
		});
	});
});
