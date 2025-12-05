/**
 * Validation utilities for API requests
 */

import { json } from '@sveltejs/kit';
import { z } from 'zod';

/**
 * Handle Zod validation errors with user-friendly messages
 * Returns a JSON response with 400 status
 */
export function handleValidationError(error: unknown) {
	if (error instanceof z.ZodError) {
		const firstError = error.issues[0];
		return json(
			{ error: firstError.message || `Invalid ${firstError.path.join('.')}` },
			{ status: 400 }
		);
	}
	return json({ error: 'Invalid request body' }, { status: 400 });
}

/**
 * Parse and validate request body with a Zod schema
 * Throws validation errors that can be caught and handled
 */
export async function validateRequestBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
	const rawBody = await request.json();
	return schema.parse(rawBody);
}

/**
 * Email validation regex - Restrictive pattern for enterprise use
 * Allows: alphanumeric, dots, hyphens, underscores, and plus signs
 * More restrictive than RFC 5322 for security (prevents SQL injection risky characters)
 *
 * Pattern: localpart@domain.tld
 * - Local part: a-zA-Z0-9._+-
 * - Domain: a-zA-Z0-9.-
 * - TLD: a-zA-Z (2+ characters)
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate an email address
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
	if (!email || typeof email !== 'string') {
		return false;
	}
	return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate and parse an integer with range checking
 * @param value - Value to parse
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns Parsed integer or null if invalid
 */
export function parseIntInRange(
	value: string | number | null | undefined,
	min: number,
	max: number
): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	const parsed = typeof value === 'number' ? value : parseInt(value);

	if (isNaN(parsed) || parsed < min || parsed > max) {
		return null;
	}

	return parsed;
}

/**
 * Validation constants
 */
export const VALIDATION_LIMITS = {
	// String lengths
	EMAIL_MAX_LENGTH: 255,
	NAME_MAX_LENGTH: 255,
	PHONE_MAX_LENGTH: 50,
	DESCRIPTION_MAX_LENGTH: 2000,

	// Numeric ranges
	SEATS_MIN: 1,
	SEATS_MAX: 1_000_000
} as const;

/**
 * Rate limiting constants
 */
export const RATE_LIMITS = {
	// Enterprise inquiries: 5 per hour per email
	ENTERPRISE_INQUIRY_MAX_ATTEMPTS: 5,
	ENTERPRISE_INQUIRY_WINDOW_MS: 60 * 60 * 1000, // 1 hour

	// Duplicate inquiry detection window
	ENTERPRISE_INQUIRY_DUPLICATE_WINDOW_MS: 24 * 60 * 60 * 1000 // 24 hours
} as const;

/**
 * Valid enterprise inquiry status values
 */
export const INQUIRY_STATUSES = [
	'pending',
	'contacted',
	'qualified',
	'converted',
	'rejected'
] as const;

/**
 * Type for inquiry status
 */
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/**
 * Validate inquiry status value
 * @param status - Status value to validate
 * @returns true if valid, false otherwise
 */
export function isValidInquiryStatus(status: string): status is InquiryStatus {
	return INQUIRY_STATUSES.includes(status as InquiryStatus);
}
