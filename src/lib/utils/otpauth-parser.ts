/**
 * Parse an otpauth:// URI into its components
 * Format: otpauth://totp/LABEL?secret=SECRET&issuer=ISSUER&algorithm=SHA1&digits=6&period=30
 */
export interface OTPAuthData {
	type: 'totp' | 'hotp';
	label: string;
	secret: string;
	issuer?: string;
	algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
	digits?: number;
	period?: number;
	counter?: number;
}

export function parseOTPAuthURL(url: string): OTPAuthData {
	try {
		const urlObj = new URL(url);

		// Validate protocol
		if (urlObj.protocol !== 'otpauth:') {
			throw new Error('Invalid protocol - must be otpauth://');
		}

		// Get type (totp or hotp)
		const type = urlObj.host.toLowerCase();
		if (type !== 'totp' && type !== 'hotp') {
			throw new Error('Invalid type - must be totp or hotp');
		}

		// Get label (account name)
		const label = decodeURIComponent(urlObj.pathname.substring(1)); // Remove leading /

		// Get secret (required)
		const secret = urlObj.searchParams.get('secret');
		if (!secret) {
			throw new Error('Secret parameter is required');
		}

		// Get optional parameters
		const issuer = urlObj.searchParams.get('issuer') || undefined;
		const algorithm =
			(urlObj.searchParams.get('algorithm')?.toUpperCase() as
				| 'SHA1'
				| 'SHA256'
				| 'SHA512'
				| undefined) || 'SHA1';
		const digits = urlObj.searchParams.get('digits')
			? parseInt(urlObj.searchParams.get('digits')!)
			: 6;
		const period = urlObj.searchParams.get('period')
			? parseInt(urlObj.searchParams.get('period')!)
			: 30;
		const counter = urlObj.searchParams.get('counter')
			? parseInt(urlObj.searchParams.get('counter')!)
			: undefined;

		return {
			type,
			label,
			secret,
			issuer,
			algorithm,
			digits,
			period,
			counter
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to parse OTP URL: ${error.message}`);
		}
		throw new Error('Failed to parse OTP URL');
	}
}

/**
 * Validate a base32 secret
 */
export function isValidBase32Secret(secret: string): boolean {
	// Base32 alphabet is A-Z and 2-7
	const base32Regex = /^[A-Z2-7]+=*$/;
	return base32Regex.test(secret.toUpperCase());
}
