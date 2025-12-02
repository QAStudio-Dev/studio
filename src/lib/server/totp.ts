import * as OTPAuth from 'otpauth';
import { decryptTOTPSecret } from './totp-crypto';

export interface TOTPConfig {
	secret: string; // Encrypted secret from database
	issuer?: string;
	accountName?: string;
	algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
	digits?: number;
	period?: number;
}

/**
 * Generate a TOTP code from an encrypted secret
 */
export function generateTOTPCode(config: TOTPConfig): string {
	// Decrypt the secret
	const secret = decryptTOTPSecret(config.secret);

	// Create TOTP instance
	const totp = new OTPAuth.TOTP({
		issuer: config.issuer,
		label: config.accountName,
		algorithm: config.algorithm || 'SHA1',
		digits: config.digits || 6,
		period: config.period || 30,
		secret: OTPAuth.Secret.fromBase32(secret)
	});

	// Generate current code
	return totp.generate();
}

/**
 * Get time remaining until next code (in seconds)
 */
export function getTimeRemaining(period: number = 30): number {
	const now = Math.floor(Date.now() / 1000);
	return period - (now % period);
}

/**
 * Verify if a TOTP code is valid
 */
export function verifyTOTPCode(config: TOTPConfig, token: string): boolean {
	const secret = decryptTOTPSecret(config.secret);

	const totp = new OTPAuth.TOTP({
		issuer: config.issuer,
		label: config.accountName,
		algorithm: config.algorithm || 'SHA1',
		digits: config.digits || 6,
		period: config.period || 30,
		secret: OTPAuth.Secret.fromBase32(secret)
	});

	// Verify with 1-window tolerance (allows codes from previous/next period)
	const delta = totp.validate({ token, window: 1 });
	return delta !== null;
}
