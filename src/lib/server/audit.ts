import { db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export type AuditAction =
	// Authentication Events
	| 'USER_LOGIN_SUCCESS'
	| 'USER_LOGIN_FAILED'
	| 'USER_LOGOUT'
	| 'USER_PASSWORD_CHANGED'
	| 'USER_PASSWORD_RESET_REQUESTED'
	| 'USER_PASSWORD_RESET_COMPLETED'
	| 'USER_EMAIL_VERIFIED'
	| 'SESSION_CREATED'
	| 'SESSION_EXPIRED'
	// User Management
	| 'USER_CREATED'
	| 'USER_UPDATED'
	| 'USER_DELETED'
	| 'USER_ROLE_CHANGED'
	| 'USER_PROFILE_UPDATED'
	// Team Management
	| 'TEAM_CREATED'
	| 'TEAM_UPDATED'
	| 'TEAM_DELETED'
	| 'TEAM_PLAN_CHANGED'
	| 'TEAM_MEMBER_ADDED'
	| 'TEAM_MEMBER_REMOVED'
	| 'TEAM_INVITATION_SENT'
	| 'TEAM_INVITATION_ACCEPTED'
	| 'TEAM_INVITATION_REVOKED'
	// API Keys
	| 'API_KEY_CREATED'
	| 'API_KEY_DELETED'
	| 'API_KEY_USED'
	// Authenticator Tokens
	| 'AUTHENTICATOR_TOKEN_CREATED'
	| 'AUTHENTICATOR_TOKEN_UPDATED'
	| 'AUTHENTICATOR_TOKEN_DELETED'
	| 'AUTHENTICATOR_TOKEN_VIEWED'
	| 'AUTHENTICATOR_TOKEN_CODE_GENERATED'
	// Data Access (GDPR)
	| 'USER_DATA_EXPORTED'
	| 'USER_DATA_DELETED'
	| 'SENSITIVE_DATA_ACCESSED'
	// Project & Test Data
	| 'PROJECT_CREATED'
	| 'PROJECT_UPDATED'
	| 'PROJECT_DELETED'
	| 'PROJECT_ACCESSED'
	// Subscription & Billing
	| 'SUBSCRIPTION_CREATED'
	| 'SUBSCRIPTION_UPDATED'
	| 'SUBSCRIPTION_CANCELLED'
	| 'PAYMENT_METHOD_ADDED'
	| 'PAYMENT_METHOD_REMOVED'
	// Enterprise Inquiries
	| 'ENTERPRISE_INQUIRY_CREATED'
	| 'ENTERPRISE_INQUIRY_UPDATED'
	| 'ENTERPRISE_INQUIRY_CONVERTED'
	// Security Events
	| 'UNAUTHORIZED_ACCESS_ATTEMPT'
	| 'RATE_LIMIT_EXCEEDED'
	| 'SUSPICIOUS_ACTIVITY_DETECTED'
	| 'SETTINGS_CHANGED'
	// System Operations
	| 'DATABASE_BACKUP_CREATED'
	| 'DATABASE_BACKUP_FAILED';

interface AuditLogParams {
	userId?: string | null; // Optional for anonymous events
	teamId?: string;
	action: AuditAction;
	resourceType: string;
	resourceId?: string;
	metadata?: Record<string, any>;
	event?: RequestEvent;
}

/**
 * Create an audit log entry
 * @param params - Audit log parameters
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
	const { userId, teamId, action, resourceType, resourceId, metadata, event } = params;

	// Skip creating audit log if userId is 'anonymous' or null (not a valid user)
	// Allow 'system' as a special user ID for automated operations (cron jobs, etc.)
	// These events should be logged elsewhere (e.g., application logs)
	if (!userId || (userId !== 'system' && userId === 'anonymous')) {
		console.warn(`Skipping audit log for anonymous ${action} on ${resourceType}`, {
			ipAddress: event?.request.headers.get('x-forwarded-for') || event?.getClientAddress(),
			metadata
		});
		return;
	}

	// Extract IP address and user agent from event if available
	const ipAddress = event?.request.headers.get('x-forwarded-for') || event?.getClientAddress();
	const userAgent = event?.request.headers.get('user-agent');

	try {
		await db.auditLog.create({
			data: {
				userId,
				teamId: teamId ?? undefined,
				action,
				resourceType,
				resourceId: resourceId ?? undefined,
				metadata: metadata ?? undefined,
				ipAddress: ipAddress ?? undefined,
				userAgent: userAgent ?? undefined
			}
		});
	} catch (error) {
		// Log but don't throw - audit failures shouldn't break the main operation
		console.error('Failed to create audit log:', error);
	}
}

/**
 * Sanitize metadata to ensure no sensitive data is logged
 * Removes fields like 'secret', 'password', 'token', etc.
 * Uses exact field name matching and common patterns to avoid false positives
 */
export function sanitizeMetadata(data: Record<string, any>): Record<string, any> {
	// Exact field names to filter
	const exactSensitiveKeys = [
		'secret',
		'password',
		'token',
		'key',
		'hash',
		'apikey',
		'accesstoken',
		'refreshtoken',
		'csrftoken',
		'sessiontoken'
	];

	// Patterns for common sensitive field naming conventions
	const sensitivePatterns = [
		/^.*secret$/i, // ends with "secret"
		/^.*password$/i, // ends with "password"
		/^.*token$/i, // ends with "token"
		/^.*_key$/i, // ends with "_key"
		/^.*hash$/i, // ends with "hash"
		/^api.*key$/i, // API key variations
		/^encrypted.*/i // starts with "encrypted"
	];

	const sanitized: Record<string, any> = {};

	for (const [key, value] of Object.entries(data)) {
		const lowerKey = key.toLowerCase();

		// Check exact matches first
		if (exactSensitiveKeys.includes(lowerKey)) {
			continue;
		}

		// Check regex patterns
		if (sensitivePatterns.some((pattern) => pattern.test(key))) {
			continue;
		}

		// Recursively sanitize nested objects
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			sanitized[key] = sanitizeMetadata(value);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}
