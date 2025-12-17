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
 * Deployment mode configuration
 * Self-hosted deployments bypass all payment/subscription checks
 */
export const DEPLOYMENT_CONFIG = {
	// Set SELF_HOSTED=true to disable Stripe and unlock all features
	IS_SELF_HOSTED: process.env.SELF_HOSTED === 'true' || process.env.SELF_HOSTED === '1'
} as const;

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
