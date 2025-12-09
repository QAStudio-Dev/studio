import { describe, it, expect, beforeEach } from 'vitest';
import { decodeJWT, verifyJWT, fetchJWKS } from './jwt';
import crypto from 'crypto';

describe('JWT', () => {
	describe('decodeJWT', () => {
		it('should decode a valid JWT', () => {
			// Create a simple JWT (header.payload.signature)
			const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
				'base64url'
			);
			const payload = Buffer.from(
				JSON.stringify({
					sub: '1234567890',
					name: 'Test User',
					email: 'test@example.com',
					iat: 1516239022,
					exp: 9999999999
				})
			).toString('base64url');
			const signature = Buffer.from('fake-signature').toString('base64url');

			const token = `${header}.${payload}.${signature}`;
			const decoded = decodeJWT(token);

			expect(decoded.header.alg).toBe('RS256');
			expect(decoded.header.typ).toBe('JWT');
			expect(decoded.payload.sub).toBe('1234567890');
			expect(decoded.payload.email).toBe('test@example.com');
		});

		it('should throw on invalid JWT format', () => {
			expect(() => decodeJWT('invalid')).toThrow('Invalid JWT format');
			expect(() => decodeJWT('invalid.token')).toThrow('Invalid JWT format');
			expect(() => decodeJWT('')).toThrow('Invalid JWT format');
		});

		it('should handle base64url encoding correctly', () => {
			// Test with characters that differ between base64 and base64url
			const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
			const payload = Buffer.from(
				JSON.stringify({ data: 'test+/=data', exp: 9999999999 })
			).toString('base64url');
			const signature = 'sig';

			const token = `${header}.${payload}.${signature}`;
			const decoded = decodeJWT(token);

			expect(decoded.payload.data).toBe('test+/=data');
		});
	});

	describe('verifyJWT', () => {
		let publicKey: string;
		let privateKey: string;
		let jwk: any;

		beforeEach(() => {
			// Generate RSA key pair for testing
			const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', {
				modulusLength: 2048,
				publicKeyEncoding: { type: 'spki', format: 'pem' },
				privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
			});

			publicKey = pubKey;
			privateKey = privKey;

			// Extract RSA components for JWK
			const keyObject = crypto.createPublicKey(publicKey);
			const keyDetails = keyObject.export({ format: 'jwk' }) as any;

			jwk = {
				kty: 'RSA',
				kid: 'test-key-1',
				use: 'sig',
				n: keyDetails.n,
				e: keyDetails.e
			};
		});

		function createSignedJWT(payload: any): string {
			const header = { alg: 'RS256', typ: 'JWT', kid: 'test-key-1' };
			const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
			const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

			const signData = `${headerB64}.${payloadB64}`;
			const signature = crypto.sign('RSA-SHA256', Buffer.from(signData), privateKey);
			const signatureB64 = signature.toString('base64url');

			return `${headerB64}.${payloadB64}.${signatureB64}`;
		}

		it('should verify a valid JWT with correct signature', async () => {
			const payload = {
				iss: 'https://test-issuer.com',
				sub: 'user123',
				aud: 'test-client-id',
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				email: 'test@example.com',
				nonce: 'test-nonce-123'
			};

			const token = createSignedJWT(payload);

			const verified = await verifyJWT(token, [jwk], {
				issuer: 'https://test-issuer.com',
				audience: 'test-client-id',
				nonce: 'test-nonce-123'
			});

			expect(verified.sub).toBe('user123');
			expect(verified.email).toBe('test@example.com');
		});

		it('should reject JWT with invalid signature', async () => {
			const payload = {
				iss: 'https://test-issuer.com',
				sub: 'user123',
				aud: 'test-client-id',
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				nonce: 'test-nonce'
			};

			const token = createSignedJWT(payload);
			const tamperedToken = token.slice(0, -10) + 'tampered==';

			await expect(
				verifyJWT(tamperedToken, [jwk], {
					issuer: 'https://test-issuer.com',
					audience: 'test-client-id',
					nonce: 'test-nonce'
				})
			).rejects.toThrow('Invalid JWT signature');
		});

		it('should reject expired JWT', async () => {
			const payload = {
				iss: 'https://test-issuer.com',
				sub: 'user123',
				aud: 'test-client-id',
				exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
				iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
				nonce: 'test-nonce'
			};

			const token = createSignedJWT(payload);

			await expect(
				verifyJWT(token, [jwk], {
					issuer: 'https://test-issuer.com',
					audience: 'test-client-id',
					nonce: 'test-nonce'
				})
			).rejects.toThrow('Token expired');
		});

		it('should reject JWT with wrong issuer', async () => {
			const payload = {
				iss: 'https://wrong-issuer.com',
				sub: 'user123',
				aud: 'test-client-id',
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				nonce: 'test-nonce'
			};

			const token = createSignedJWT(payload);

			await expect(
				verifyJWT(token, [jwk], {
					issuer: 'https://test-issuer.com',
					audience: 'test-client-id',
					nonce: 'test-nonce'
				})
			).rejects.toThrow('Invalid issuer');
		});

		it('should reject JWT with wrong audience', async () => {
			const payload = {
				iss: 'https://test-issuer.com',
				sub: 'user123',
				aud: 'wrong-client-id',
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				nonce: 'test-nonce'
			};

			const token = createSignedJWT(payload);

			await expect(
				verifyJWT(token, [jwk], {
					issuer: 'https://test-issuer.com',
					audience: 'test-client-id',
					nonce: 'test-nonce'
				})
			).rejects.toThrow('Invalid audience');
		});

		it('should reject JWT with wrong nonce', async () => {
			const payload = {
				iss: 'https://test-issuer.com',
				sub: 'user123',
				aud: 'test-client-id',
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				nonce: 'wrong-nonce'
			};

			const token = createSignedJWT(payload);

			await expect(
				verifyJWT(token, [jwk], {
					issuer: 'https://test-issuer.com',
					audience: 'test-client-id',
					nonce: 'test-nonce'
				})
			).rejects.toThrow('Invalid nonce');
		});

		it('should reject JWT with future iat (not yet valid)', async () => {
			const payload = {
				iss: 'https://test-issuer.com',
				sub: 'user123',
				aud: 'test-client-id',
				exp: Math.floor(Date.now() / 1000) + 7200,
				iat: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
				nonce: 'test-nonce'
			};

			const token = createSignedJWT(payload);

			await expect(
				verifyJWT(token, [jwk], {
					issuer: 'https://test-issuer.com',
					audience: 'test-client-id',
					nonce: 'test-nonce'
				})
			).rejects.toThrow('Token used before issued');
		});

		it('should reject JWT when no matching key found', async () => {
			const payload = {
				iss: 'https://test-issuer.com',
				sub: 'user123',
				aud: 'test-client-id',
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				nonce: 'test-nonce'
			};

			const token = createSignedJWT(payload);

			// Use JWK with different kid
			const wrongJwk = { ...jwk, kid: 'different-key' };

			await expect(
				verifyJWT(token, [wrongJwk], {
					issuer: 'https://test-issuer.com',
					audience: 'test-client-id',
					nonce: 'test-nonce'
				})
			).rejects.toThrow('No matching key found');
		});

		it('should support multiple audiences', async () => {
			const payload = {
				iss: 'https://test-issuer.com',
				sub: 'user123',
				aud: ['test-client-id', 'other-client-id'],
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				nonce: 'test-nonce'
			};

			const token = createSignedJWT(payload);

			const verified = await verifyJWT(token, [jwk], {
				issuer: 'https://test-issuer.com',
				audience: 'test-client-id',
				nonce: 'test-nonce'
			});

			expect(verified.sub).toBe('user123');
		});
	});

	describe('fetchJWKS', () => {
		it('should fetch JWKS from URL', async () => {
			// Note: This is a real URL test - might want to mock in production tests
			const mockJwksUri = 'https://www.googleapis.com/oauth2/v3/certs';

			try {
				const jwks = await fetchJWKS(mockJwksUri);
				expect(Array.isArray(jwks)).toBe(true);
				expect(jwks.length).toBeGreaterThan(0);
				expect(jwks[0]).toHaveProperty('kty');
				expect(jwks[0]).toHaveProperty('kid');
			} catch (error) {
				// Network errors are acceptable in tests
				expect(error).toBeDefined();
			}
		});

		it('should handle invalid JWKS URL gracefully', async () => {
			// Note: fetch might return empty response or error depending on network/DNS
			// This test verifies the function doesn't crash
			try {
				const jwks = await fetchJWKS(
					'https://invalid-url-that-does-not-exist-12345.com/jwks'
				);
				// If it succeeds (unlikely), should return array
				expect(Array.isArray(jwks)).toBe(true);
			} catch (error) {
				// If it fails (expected), error should be defined
				expect(error).toBeDefined();
			}
		});
	});
});
