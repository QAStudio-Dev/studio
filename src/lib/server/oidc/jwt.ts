/**
 * Minimal JWT decoder and verifier using only Node.js built-in crypto
 * No external dependencies - just parsing and signature verification
 *
 * This is intentionally minimal to avoid external auth dependencies.
 * For production, ensure you're using TLS to fetch JWKS and verify issuer URLs.
 */

import crypto from 'crypto';

/**
 * JWT header structure
 */
interface JWTHeader {
	alg: string;
	kid?: string;
	typ?: string;
}

/**
 * JWT payload structure (OpenID Connect ID Token)
 */
export interface JWTPayload {
	iss: string; // Issuer
	sub: string; // Subject (user ID)
	aud: string | string[]; // Audience (client ID)
	exp: number; // Expiration time (unix timestamp)
	iat: number; // Issued at (unix timestamp)
	nonce?: string; // Nonce for replay protection
	email?: string; // User email
	email_verified?: boolean; // Email verification status
	name?: string; // Full name
	given_name?: string; // First name
	family_name?: string; // Last name
	picture?: string; // Profile picture URL
	[key: string]: any; // Additional claims
}

/**
 * JWKS (JSON Web Key Set) key structure
 */
interface JWK {
	kty: string;
	use?: string;
	kid?: string;
	n?: string; // RSA modulus (base64url encoded)
	e?: string; // RSA exponent (base64url encoded)
	x?: string; // EC x coordinate
	y?: string; // EC y coordinate
	crv?: string; // EC curve name
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
	// Convert base64url to base64
	let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

	// Add padding if needed
	while (base64.length % 4 !== 0) {
		base64 += '=';
	}

	return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Decode JWT without verification (for inspection)
 */
export function decodeJWT(token: string): { header: JWTHeader; payload: JWTPayload } {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const header = JSON.parse(base64UrlDecode(parts[0]));
	const payload = JSON.parse(base64UrlDecode(parts[1]));

	return { header, payload };
}

/**
 * Convert JWK to PEM format for crypto.verify
 * Uses Node.js built-in crypto.createPublicKey for proper conversion
 */
function jwkToPem(jwk: JWK): string {
	if (jwk.kty === 'RSA') {
		if (!jwk.n || !jwk.e) {
			throw new Error('Invalid RSA key - missing n or e');
		}

		// Use Node.js crypto to create public key from JWK
		const publicKey = crypto.createPublicKey({
			key: jwk as crypto.JsonWebKey,
			format: 'jwk'
		});

		// Export as PEM
		const pem = publicKey.export({
			type: 'spki',
			format: 'pem'
		}) as string;

		return pem;
	}

	throw new Error(`Unsupported JWK key type: ${jwk.kty}`);
}

/**
 * Verify JWT signature using JWKS
 */
export async function verifyJWT(
	token: string,
	jwks: JWK[],
	options: {
		issuer: string;
		audience: string;
		nonce?: string;
	}
): Promise<JWTPayload> {
	// Decode token
	const { header, payload } = decodeJWT(token);

	// Verify algorithm is RS256 (most common for OIDC)
	if (header.alg !== 'RS256') {
		throw new Error(`Unsupported algorithm: ${header.alg}`);
	}

	// Find matching key in JWKS
	const jwk = jwks.find((k) => k.kid === header.kid);
	if (!jwk) {
		throw new Error(`No matching key found for kid: ${header.kid}`);
	}

	// Convert JWK to PEM
	const publicKey = jwkToPem(jwk);

	// Verify signature
	const [headerB64, payloadB64, signatureB64] = token.split('.');
	const signedData = `${headerB64}.${payloadB64}`;
	const signature = Buffer.from(signatureB64, 'base64url');

	const verifier = crypto.createVerify('RSA-SHA256');
	verifier.update(signedData);

	const isValid = verifier.verify(publicKey, signature);
	if (!isValid) {
		throw new Error('Invalid JWT signature');
	}

	// Verify claims
	const now = Math.floor(Date.now() / 1000);
	const clockSkew = 60; // Allow 60 second clock skew for exp and iat

	// Check expiration (with clock skew tolerance)
	if (payload.exp < now - clockSkew) {
		throw new Error('Token expired');
	}

	// Check issued at (token not used before it was issued, with clock skew tolerance)
	if (payload.iat > now + clockSkew) {
		throw new Error('Token used before issued');
	}

	// Verify issuer
	if (payload.iss !== options.issuer) {
		throw new Error(`Invalid issuer: expected ${options.issuer}, got ${payload.iss}`);
	}

	// Verify audience
	const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
	if (!audiences.includes(options.audience)) {
		throw new Error(`Invalid audience: expected ${options.audience}`);
	}

	// Verify nonce (if provided)
	if (options.nonce && payload.nonce !== options.nonce) {
		throw new Error('Invalid nonce - possible replay attack');
	}

	return payload;
}

/**
 * Fetch JWKS from URL
 */
export async function fetchJWKS(jwksUri: string): Promise<JWK[]> {
	const response = await fetch(jwksUri);

	if (!response.ok) {
		throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
	}

	const data = await response.json();
	return data.keys || [];
}
