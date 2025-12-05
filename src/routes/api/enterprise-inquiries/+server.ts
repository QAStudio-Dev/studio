import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

/**
 * Submit an enterprise inquiry
 * POST /api/enterprise-inquiries
 */
export const POST: RequestHandler = async (event) => {
	// Get user if authenticated (optional)
	const { userId, user } = event.locals.auth() || {};

	const data = await event.request.json();

	const { companyName, contactName, email, phone, estimatedSeats, requirements } = data;

	// Validation
	if (!companyName || typeof companyName !== 'string') {
		throw error(400, { message: 'Company name is required' });
	}

	if (!email || typeof email !== 'string') {
		throw error(400, { message: 'Email is required' });
	}

	// Basic email validation
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw error(400, { message: 'Invalid email address' });
	}

	// Create the inquiry
	const inquiry = await db.enterpriseInquiry.create({
		data: {
			teamId: user?.teamId || null,
			companyName: companyName.trim(),
			contactName: contactName?.trim() || null,
			email: email.trim(),
			phone: phone?.trim() || null,
			estimatedSeats: estimatedSeats ? parseInt(estimatedSeats) : null,
			requirements: requirements?.trim() || null,
			status: 'pending'
		}
	});

	// TODO: Send email notification to sales team
	// You can implement this later with your email service
	// Example:
	// await sendEmail({
	//   to: 'sales@yourdomain.com',
	//   subject: `New Enterprise Inquiry: ${companyName}`,
	//   html: `...`
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
