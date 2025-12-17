/**
 * Application Configuration
 * Centralized configuration for default values and constants
 */

/**
 * Email configuration defaults
 */
export const EMAIL_CONFIG = {
	// Default email addresses
	DEFAULT_FROM: 'noreply@qastudio.dev',
	DEFAULT_SALES_EMAIL: 'ben@qastudio.dev',

	// SMTP defaults (Gmail)
	DEFAULT_HOST: 'smtp.gmail.com',
	DEFAULT_PORT: 587,
	DEFAULT_SECURE: false
} as const;

/**
 * Application URL configuration
 */
export const APP_CONFIG = {
	// Production URL
	DEFAULT_URL: 'https://qastudio.dev'
} as const;

/**
 * Password reset configuration
 */
export const PASSWORD_RESET_CONFIG = {
	// Token expiration in minutes
	TOKEN_EXPIRES_MINUTES: 60
} as const;

/**
 * Parse boolean environment variable with support for common truthy values
 * Accepts: 'true', '1', 'yes', 'on' (case-insensitive, whitespace trimmed)
 */
function parseBooleanEnv(value: string | undefined, defaultValue = false): boolean {
	if (!value) return defaultValue;
	return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Deployment mode configuration
 * Self-hosted deployments bypass all payment/subscription checks
 *
 * IMPORTANT: Configuration is evaluated at module load time (server startup).
 * Changing environment variables requires a server restart to take effect.
 * This is intentional for security and performance - deployment mode should
 * not change during runtime.
 *
 * SECURITY: Object is frozen to prevent runtime modification. Any attempt to
 * change IS_SELF_HOSTED after module load will fail, preventing malicious code
 * from bypassing payment checks.
 */
export const DEPLOYMENT_CONFIG = Object.freeze({
	/**
	 * Set SELF_HOSTED=true to disable Stripe and unlock all features
	 * Accepts: true, 1, yes, on (case-insensitive, whitespace trimmed)
	 *
	 * Note: Evaluated once at server startup. Changes require server restart.
	 * This value is frozen and cannot be changed at runtime.
	 */
	IS_SELF_HOSTED: parseBooleanEnv(process.env.SELF_HOSTED, false)
});

/**
 * Rate limiting configuration
 * Can be overridden via environment variables
 */
export const RATE_LIMIT_CONFIG = {
	// Signup rate limits
	SIGNUP_MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_SIGNUP_MAX_ATTEMPTS || '3'),
	SIGNUP_WINDOW_HOURS: parseInt(process.env.RATE_LIMIT_SIGNUP_WINDOW_HOURS || '1'),

	// Login rate limits
	LOGIN_MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_LOGIN_MAX_ATTEMPTS || '5'),
	LOGIN_WINDOW_MINUTES: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MINUTES || '15'),

	// Enterprise inquiry rate limits
	ENTERPRISE_INQUIRY_MAX_ATTEMPTS: parseInt(
		process.env.RATE_LIMIT_ENTERPRISE_INQUIRY_MAX_ATTEMPTS || '5'
	),
	ENTERPRISE_INQUIRY_WINDOW_HOURS: parseInt(
		process.env.RATE_LIMIT_ENTERPRISE_INQUIRY_WINDOW_HOURS || '1'
	),
	ENTERPRISE_INQUIRY_DUPLICATE_WINDOW_HOURS: parseInt(
		process.env.RATE_LIMIT_ENTERPRISE_INQUIRY_DUPLICATE_WINDOW_HOURS || '24'
	),

	// In-memory cleanup interval (5 minutes)
	CLEANUP_INTERVAL_MS:
		parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MINUTES || '5') * 60 * 1000
} as const;
