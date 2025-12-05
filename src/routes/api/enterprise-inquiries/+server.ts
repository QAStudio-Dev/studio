import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifyCsrfToken } from '$lib/server/sessions';
import { Ratelimit } from '@upstash/ratelimit';
import { redis, isCacheEnabled } from '$lib/server/redis';

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
		limiter: Ratelimit.slidingWindow(5, '60 m'), // 5 inquiries per hour per email
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
		inquiryAttemptsMemory.set(email, { count: 1, resetAt: now + 60 * 60 * 1000 }); // 1 hour
		return true;
	}

	if (attempt.count >= 5) {
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
	// Get user if authenticated (optional)
	const { userId, user } = event.locals.auth() || {};

	const data = await event.request.json();

	const { companyName, contactName, email, phone, estimatedSeats, requirements, csrfToken } =
		data;

	// CRITICAL: Validate CSRF token
	if (!csrfToken || !verifyCsrfToken(csrfToken)) {
		throw error(403, { message: 'Invalid CSRF token' });
	}

	// === Input Validation ===

	// Company Name - required, max 255 chars
	if (!companyName || typeof companyName !== 'string') {
		throw error(400, { message: 'Company name is required' });
	}
	if (companyName.length > 255) {
		throw error(400, { message: 'Company name must be 255 characters or less' });
	}

	// Email - required, valid format, max 255 chars
	if (!email || typeof email !== 'string') {
		throw error(400, { message: 'Email is required' });
	}
	if (email.length > 255) {
		throw error(400, { message: 'Email must be 255 characters or less' });
	}

	// Improved email validation (RFC 5322 compliant)
	const emailRegex =
		/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	if (!emailRegex.test(email)) {
		throw error(400, { message: 'Invalid email address format' });
	}

	// Rate limiting check
	const allowed = await checkRateLimit(email);
	if (!allowed) {
		throw error(429, {
			message: 'Too many inquiry submissions. Please try again in an hour.'
		});
	}

	// Contact Name - optional, max 255 chars
	if (contactName && typeof contactName === 'string' && contactName.length > 255) {
		throw error(400, { message: 'Contact name must be 255 characters or less' });
	}

	// Phone - optional, max 50 chars
	if (phone && typeof phone === 'string' && phone.length > 50) {
		throw error(400, { message: 'Phone number must be 50 characters or less' });
	}

	// Estimated Seats - optional, must be positive integer
	let validatedSeats: number | null = null;
	if (estimatedSeats) {
		const parsed = parseInt(estimatedSeats);
		if (isNaN(parsed) || parsed < 1 || parsed > 1000000) {
			throw error(400, {
				message: 'Estimated seats must be a positive number between 1 and 1,000,000'
			});
		}
		validatedSeats = parsed;
	}

	// Requirements - optional, max 2000 chars
	if (requirements && typeof requirements === 'string' && requirements.length > 2000) {
		throw error(400, { message: 'Requirements must be 2000 characters or less' });
	}

	// Check for duplicate inquiry in last 24 hours
	const recentInquiry = await db.enterpriseInquiry.findFirst({
		where: {
			email: email.toLowerCase(),
			createdAt: {
				gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
			}
		}
	});

	if (recentInquiry) {
		throw error(400, {
			message:
				'You already submitted an inquiry recently. Our team will contact you within 1 business day.'
		});
	}

	// Create the inquiry
	const inquiry = await db.enterpriseInquiry.create({
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

	// TODO: Send email notification to sales team
	// You can implement this with your email service
	// Example:
	// await sendEmail({
	//   to: 'sales@yourdomain.com',
	//   subject: `New Enterprise Inquiry: ${companyName}`,
	//   html: `
	//     <h2>New Enterprise Lead</h2>
	//     <p><strong>Company:</strong> ${companyName}</p>
	//     <p><strong>Contact:</strong> ${email}</p>
	//     <p><strong>Seats:</strong> ${validatedSeats || 'Not specified'}</p>
	//     <p><strong>Requirements:</strong> ${requirements || 'None'}</p>
	//     <a href="https://yourdomain.com/admin/teams">View in Admin Panel</a>
	//   `
	// });

	return json({
		success: true,
		inquiry: {
			id: inquiry.id,
			companyName: inquiry.companyName,
			email: inquiry.email
		}
	});
};
