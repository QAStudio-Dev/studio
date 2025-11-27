/**
 * Environment variable validation for security-critical configuration
 *
 * This module ensures that required environment variables are properly set
 * and prevents the use of insecure default values in production.
 */

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(name: string, defaultValue?: string): string {
	const value = process.env[name];

	// In production, require actual values (no defaults)
	if (process.env.NODE_ENV === 'production') {
		if (!value) {
			throw new Error(
				`Missing required environment variable: ${name}. ` +
					`This must be set in production for security.`
			);
		}

		// Check if using insecure default value
		if (defaultValue && value === defaultValue) {
			throw new Error(
				`Environment variable ${name} is using the default development value. ` +
					`This is insecure in production. Please set a unique value.`
			);
		}

		return value;
	}

	// In development, allow defaults but warn if not set
	if (!value && defaultValue) {
		console.warn(
			`⚠️  Environment variable ${name} not set. Using default value. ` +
				`Set this in production for security.`
		);
		return defaultValue;
	}

	if (!value) {
		throw new Error(
			`Missing required environment variable: ${name}. ` +
				`Please set this in your .env file.`
		);
	}

	return value;
}

/**
 * Validate and load all required environment variables
 * Call this at server startup to fail fast if configuration is invalid
 */
export function validateEnvironment(): void {
	// Validate all security-critical environment variables
	getSessionSecret();
	getResetSecret();

	console.log('✓ Environment variables validated successfully');
}

/**
 * Session secret for HMAC signing of session tokens
 * MUST be set to a cryptographically secure random value in production
 */
export function getSessionSecret(): string {
	return getRequiredEnv(
		'SESSION_SECRET',
		process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-change-in-production'
	);
}

/**
 * Password reset secret for HMAC signing of reset tokens
 * Falls back to SESSION_SECRET if not set, but separate values are recommended
 */
export function getResetSecret(): string {
	const resetSecret = process.env.RESET_SECRET;

	if (resetSecret) {
		return resetSecret;
	}

	// Fall back to session secret
	const sessionSecret = getSessionSecret();

	if (process.env.NODE_ENV !== 'production') {
		console.warn(
			'⚠️  RESET_SECRET not set. Using SESSION_SECRET as fallback. ' +
				'Consider setting a separate RESET_SECRET in production.'
		);
	}

	return sessionSecret;
}

/**
 * Generate secure random secret for environment variable
 * Use this to generate values for .env file
 */
export function generateSecret(bytes: number = 32): string {
	const crypto = require('crypto');
	return crypto.randomBytes(bytes).toString('base64');
}
