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
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
	// Signup rate limits
	SIGNUP_MAX_ATTEMPTS: 3,
	SIGNUP_WINDOW_HOURS: 1,

	// Login rate limits
	LOGIN_MAX_ATTEMPTS: 5,
	LOGIN_WINDOW_MINUTES: 15,

	// In-memory cleanup interval (5 minutes)
	CLEANUP_INTERVAL_MS: 5 * 60 * 1000
} as const;
