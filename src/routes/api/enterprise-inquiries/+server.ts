import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifyCsrfToken } from '$lib/server/sessions';
import { Ratelimit } from '@upstash/ratelimit';
import { redis, isCacheEnabled } from '$lib/server/redis';
import { VALIDATION_LIMITS, RATE_LIMITS, EMAIL_REGEX } from '$lib/server/validation';
import { getAuthenticatedUser } from '$lib/server/auth';
import { sendEnterpriseInquiryEmail } from '$lib/server/email';
import { z } from 'zod';
import { RATE_LIMIT_CONFIG } from '$lib/config';

/**
 * Zod schema for validating enterprise inquiry request body
 */
const enterpriseInquirySchema = z.object({
	companyName: z
		.string()
		.trim()
		.min(1, 'Company name is required')
		.max(
			VALIDATION_LIMITS.NAME_MAX_LENGTH,
			`Company name must be ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters or less`
		),
	contactName: z
		.string()
		.trim()
		.max(
			VALIDATION_LIMITS.NAME_MAX_LENGTH,
			`Contact name must be ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters or less`
		)
		.optional()
		.nullable(),
	email: z
		.string()
		.trim()
		.min(1, 'Email is required')
		.max(
			VALIDATION_LIMITS.EMAIL_MAX_LENGTH,
			`Email must be ${VALIDATION_LIMITS.EMAIL_MAX_LENGTH} characters or less`
		)
		.regex(EMAIL_REGEX, 'Invalid email address format')
		.transform((val) => val.toLowerCase()),
	phone: z
		.string()
		.trim()
		.max(
			VALIDATION_LIMITS.PHONE_MAX_LENGTH,
			`Phone number must be ${VALIDATION_LIMITS.PHONE_MAX_LENGTH} characters or less`
		)
		.optional()
		.nullable(),
	estimatedSeats: z
		.number()
		.int('Estimated seats must be a whole number')
		.min(
			VALIDATION_LIMITS.SEATS_MIN,
			`Estimated seats must be at least ${VALIDATION_LIMITS.SEATS_MIN}`
		)
		.max(
			VALIDATION_LIMITS.SEATS_MAX,
			`Estimated seats must be ${VALIDATION_LIMITS.SEATS_MAX.toLocaleString()} or less`
		)
		.optional()
		.nullable(),
	requirements: z
		.string()
		.trim()
		.max(
			VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
			`Requirements must be ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters or less`
		)
		.optional()
		.nullable(),
	csrfToken: z.string().min(1, 'CSRF token is required')
});

type EnterpriseInquiryInput = z.infer<typeof enterpriseInquirySchema>;

/**
 * Rate limiting for enterprise inquiries
 * Prevents spam and abuse of the public contact form
 */
let ratelimit: Ratelimit | null = null;
const inquiryAttemptsMemory = new Map<string, { count: number; resetAt: number }>();

// Initialize rate limiter if Redis is available
if (isCacheEnabled) {
	ratelimit = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(
			RATE_LIMITS.ENTERPRISE_INQUIRY_MAX_ATTEMPTS,
			`${RATE_LIMITS.ENTERPRISE_INQUIRY_WINDOW_MS / 1000} s`
		),
		analytics: true,
		prefix: 'ratelimit:enterprise-inquiry'
	});
}

/**
 * Clean up expired entries from in-memory rate limiter
 * Prevents memory leaks by removing entries past their reset time
 */
function cleanupExpiredEntries() {
	const now = Date.now();
	for (const [email, attempt] of inquiryAttemptsMemory.entries()) {
		if (now > attempt.resetAt) {
			inquiryAttemptsMemory.delete(email);
		}
	}
}

// Periodic cleanup of expired entries (global singleton pattern to prevent multiple intervals)
const CLEANUP_KEY = Symbol.for('enterprise-inquiry-cleanup');
if (!isCacheEnabled && !(globalThis as any)[CLEANUP_KEY]) {
	(globalThis as any)[CLEANUP_KEY] = setInterval(
		cleanupExpiredEntries,
		RATE_LIMIT_CONFIG.CLEANUP_INTERVAL_MS
	);
}

async function checkRateLimit(email: string): Promise<boolean> {
	// Use Redis rate limiting if available
	if (ratelimit) {
		const { success } = await ratelimit.limit(email.toLowerCase());
		return success;
	}

	// Fallback to in-memory rate limiting for development
	const now = Date.now();
	const attempt = inquiryAttemptsMemory.get(email);

	if (!attempt || now > attempt.resetAt) {
		// Clean up this entry if expired
		if (attempt && now > attempt.resetAt) {
			inquiryAttemptsMemory.delete(email);
		}

		inquiryAttemptsMemory.set(email, {
			count: 1,
			resetAt: now + RATE_LIMITS.ENTERPRISE_INQUIRY_WINDOW_MS
		});
		return true;
	}

	if (attempt.count >= RATE_LIMITS.ENTERPRISE_INQUIRY_MAX_ATTEMPTS) {
		return false;
	}

	attempt.count++;
	return true;
}

/**
 * Submit an enterprise inquiry
 * POST /api/enterprise-inquiries
 */
export const POST: RequestHandler = async (event) => {
	// Get user if authenticated (optional for this endpoint)
	const user = await getAuthenticatedUser(event);

	const rawData = await event.request.json();

	// === Input Validation with Zod ===
	const parseResult = enterpriseInquirySchema.safeParse(rawData);

	if (!parseResult.success) {
		const firstError = parseResult.error.issues[0];
		throw error(400, { message: firstError.message });
	}

	const { companyName, contactName, email, phone, estimatedSeats, requirements, csrfToken } =
		parseResult.data;

	// CRITICAL: Validate CSRF token
	if (!verifyCsrfToken(event, csrfToken)) {
		throw error(403, { message: 'Invalid CSRF token' });
	}

	// Rate limiting check
	const allowed = await checkRateLimit(email);
	if (!allowed) {
		throw error(429, {
			message: 'Too many inquiry submissions. Please try again in an hour.'
		});
	}

	// Use transaction to prevent race conditions between duplicate check and create
	// The unique index provides database-level protection, but we also check explicitly
	// to return a better error message to the user
	const inquiry = await db.$transaction(async (tx) => {
		// Check for duplicate inquiry within the duplicate detection window
		const recentInquiry = await tx.enterpriseInquiry.findFirst({
			where: {
				email,
				createdAt: {
					gte: new Date(Date.now() - RATE_LIMITS.ENTERPRISE_INQUIRY_DUPLICATE_WINDOW_MS)
				}
			}
		});

		if (recentInquiry) {
			throw error(400, {
				message:
					'You already submitted an inquiry recently. Our team will contact you within 1 business day.'
			});
		}

		// Create the inquiry (protected by unique index at database level)
		// Note: Zod schema already trimmed and lowercased the data
		return await tx.enterpriseInquiry.create({
			data: {
				teamId: user?.teamId || null,
				companyName,
				contactName: contactName || null,
				email,
				phone: phone || null,
				estimatedSeats: estimatedSeats || null,
				requirements: requirements || null,
				status: 'pending'
			}
		});
	});

	// Send email notification to sales team
	// Don't await - send async to avoid delaying response to user
	sendEnterpriseInquiryEmail({
		companyName: inquiry.companyName,
		contactName: inquiry.contactName,
		email: inquiry.email,
		phone: inquiry.phone,
		estimatedSeats: inquiry.estimatedSeats,
		requirements: inquiry.requirements,
		inquiryId: inquiry.id
	}).catch((error) => {
		// Log error but don't fail the request
		console.error('Failed to send enterprise inquiry email:', error);
	});

	return json({
		success: true,
		inquiry: {
			id: inquiry.id,
			companyName: inquiry.companyName,
			email: inquiry.email
		}
	});
};
