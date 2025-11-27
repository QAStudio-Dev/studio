import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

/**
 * Bcrypt configuration
 * Using 12 rounds as recommended by OWASP for 2025
 * This provides strong security while maintaining reasonable performance
 */
const BCRYPT_ROUNDS = 12;

/**
 * Session token length (32 characters provides 256 bits of entropy)
 */
const SESSION_TOKEN_LENGTH = 32;

/**
 * Hash a password using bcrypt
 * Bcrypt automatically handles salting and is designed to be slow to prevent brute force attacks
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random token
 * Uses nanoid which provides URL-safe tokens with high entropy
 *
 * @param length - Length of token (default: 32 characters)
 * @returns Random token string
 */
export function generateToken(length: number = SESSION_TOKEN_LENGTH): string {
	return nanoid(length);
}

/**
 * Hash a token using bcrypt
 * Used for storing session tokens and reset tokens securely in the database
 *
 * @param token - Token to hash
 * @returns Promise resolving to bcrypt hash
 */
export async function hashToken(token: string): Promise<string> {
	// Use fewer rounds for tokens since they're already random
	return bcrypt.hash(token, 10);
}

/**
 * Verify a token against a bcrypt hash
 *
 * @param token - Plain text token to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise resolving to true if token matches, false otherwise
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
	return bcrypt.compare(token, hash);
}
