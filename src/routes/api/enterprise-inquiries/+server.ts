import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifyCsrfToken } from '$lib/server/sessions';
import { Ratelimit } from '@upstash/ratelimit';
import { redis, isCacheEnabled } from '$lib/server/redis';
import {
	isValidEmail,
	parseIntInRange,
	VALIDATION_LIMITS,
	RATE_LIMITS
} from '$lib/server/validation';
import { getAuthenticatedUser } from '$lib/server/auth';
import { sendEnterpriseInquiryEmail } from '$lib/server/email';

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

	const data = await event.request.json();

	const { companyName, contactName, email, phone, estimatedSeats, requirements, csrfToken } =
		data;

	// CRITICAL: Validate CSRF token
	if (!csrfToken || !verifyCsrfToken(event, csrfToken)) {
		throw error(403, { message: 'Invalid CSRF token' });
	}

	// === Input Validation ===

	// Company Name - required, max length
	if (!companyName || typeof companyName !== 'string') {
		throw error(400, { message: 'Company name is required' });
	}
	if (companyName.length > VALIDATION_LIMITS.NAME_MAX_LENGTH) {
		throw error(400, {
			message: `Company name must be ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters or less`
		});
	}

	// Email - required, valid format, max length
	if (!email || typeof email !== 'string') {
		throw error(400, { message: 'Email is required' });
	}
	if (email.length > VALIDATION_LIMITS.EMAIL_MAX_LENGTH) {
		throw error(400, {
			message: `Email must be ${VALIDATION_LIMITS.EMAIL_MAX_LENGTH} characters or less`
		});
	}

	// Validate email format
	if (!isValidEmail(email)) {
		throw error(400, { message: 'Invalid email address format' });
	}

	// Rate limiting check
	const allowed = await checkRateLimit(email);
	if (!allowed) {
		throw error(429, {
			message: 'Too many inquiry submissions. Please try again in an hour.'
		});
	}

	// Contact Name - optional, max length
	if (
		contactName &&
		typeof contactName === 'string' &&
		contactName.length > VALIDATION_LIMITS.NAME_MAX_LENGTH
	) {
		throw error(400, {
			message: `Contact name must be ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters or less`
		});
	}

	// Phone - optional, max length
	if (phone && typeof phone === 'string' && phone.length > VALIDATION_LIMITS.PHONE_MAX_LENGTH) {
		throw error(400, {
			message: `Phone number must be ${VALIDATION_LIMITS.PHONE_MAX_LENGTH} characters or less`
		});
	}

	// Estimated Seats - optional, must be positive integer in valid range
	const validatedSeats = parseIntInRange(
		estimatedSeats,
		VALIDATION_LIMITS.SEATS_MIN,
		VALIDATION_LIMITS.SEATS_MAX
	);
	if (estimatedSeats && validatedSeats === null) {
		throw error(400, {
			message: `Estimated seats must be a positive number between ${VALIDATION_LIMITS.SEATS_MIN} and ${VALIDATION_LIMITS.SEATS_MAX.toLocaleString()}`
		});
	}

	// Requirements - optional, max length
	if (
		requirements &&
		typeof requirements === 'string' &&
		requirements.length > VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH
	) {
		throw error(400, {
			message: `Requirements must be ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters or less`
		});
	}

	// Use transaction to prevent race conditions between duplicate check and create
	// The unique index provides database-level protection, but we also check explicitly
	// to return a better error message to the user
	const inquiry = await db.$transaction(async (tx) => {
		// Check for duplicate inquiry within the duplicate detection window
		const recentInquiry = await tx.enterpriseInquiry.findFirst({
			where: {
				email: email.toLowerCase(),
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
		return await tx.enterpriseInquiry.create({
			data: {
				teamId: user?.teamId || null,
				companyName: companyName.trim(),
				contactName: contactName?.trim() || null,
				email: email.toLowerCase().trim(),
				phone: phone?.trim() || null,
				estimatedSeats: validatedSeats,
				requirements: requirements?.trim() || null,
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
