import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId, user } = locals.auth() || {};

	if (!userId || !user) {
		throw redirect(302, '/login');
	}

	// Only allow OWNER role to access admin panel
	if (user.role !== 'OWNER') {
		throw error(403, { message: 'Access denied. Admin access required.' });
	}

	// Fetch all teams with subscription and member info
	const teams = await db.team.findMany({
		include: {
			members: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					role: true
				}
			},
			subscription: true,
			_count: {
				select: {
					members: true,
					projects: true
				}
			}
		},
		orderBy: {
			createdAt: 'desc'
		}
	});

	// Fetch enterprise inquiries
	const inquiries = await db.enterpriseInquiry.findMany({
		include: {
			team: {
				select: {
					id: true,
					name: true
				}
			}
		},
		orderBy: {
			createdAt: 'desc'
		}
	});

	return {
		teams,
		inquiries
	};
};

export const actions: Actions = {
	upgradeToPlan: async ({ request, locals }) => {
		const { userId, user } = locals.auth() || {};

		if (!userId || user?.role !== 'OWNER') {
			return fail(403, { error: 'Access denied' });
		}

		const data = await request.formData();
		const teamId = data.get('teamId') as string;
		const plan = data.get('plan') as string;
		const customSeats = data.get('customSeats') as string;
		const contractEnd = data.get('contractEnd') as string;
		const accountManager = data.get('accountManager') as string;
		const invoiceEmail = data.get('invoiceEmail') as string;

		if (!teamId || !plan) {
			return fail(400, { error: 'Team ID and plan are required' });
		}

		const updateData: any = {
			plan
		};

		// Add enterprise-specific fields
		if (plan === 'enterprise') {
			// Validate and parse custom seats
			if (customSeats) {
				const parsed = parseInt(customSeats);
				if (isNaN(parsed) || parsed < 1 || parsed > 1000000) {
					return fail(400, {
						error: 'Custom seats must be a positive number between 1 and 1,000,000'
					});
				}
				updateData.customSeats = parsed;
			}

			// Validate contract end date
			if (contractEnd) {
				const endDate = new Date(contractEnd);
				if (isNaN(endDate.getTime())) {
					return fail(400, { error: 'Invalid contract end date' });
				}
				updateData.contractEnd = endDate;
			}

			// Validate account manager email
			if (accountManager) {
				const emailRegex =
					/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
				const trimmed = accountManager.trim();
				if (trimmed && !emailRegex.test(trimmed)) {
					return fail(400, { error: 'Invalid account manager email address' });
				}
				updateData.accountManager = trimmed;
			}

			// Validate invoice email
			if (invoiceEmail) {
				const emailRegex =
					/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
				const trimmed = invoiceEmail.trim();
				if (trimmed && !emailRegex.test(trimmed)) {
					return fail(400, { error: 'Invalid invoice email address' });
				}
				updateData.invoiceEmail = trimmed;
			}

			updateData.contractStart = new Date();
		} else {
			// Clear enterprise fields for non-enterprise plans
			updateData.customSeats = null;
			updateData.contractStart = null;
			updateData.contractEnd = null;
			updateData.accountManager = null;
			updateData.invoiceEmail = null;
		}

		await db.team.update({
			where: { id: teamId },
			data: updateData
		});

		return { success: true };
	},

	updateInquiryStatus: async ({ request, locals }) => {
		const { userId, user } = locals.auth() || {};

		if (!userId || user?.role !== 'OWNER') {
			return fail(403, { error: 'Access denied' });
		}

		const data = await request.formData();
		const inquiryId = data.get('inquiryId') as string;
		const status = data.get('status') as string;
		const assignedTo = data.get('assignedTo') as string;
		const notes = data.get('notes') as string;

		if (!inquiryId) {
			return fail(400, { error: 'Inquiry ID is required' });
		}

		const updateData: any = {};
		if (status) updateData.status = status;
		if (assignedTo) updateData.assignedTo = assignedTo.trim();
		if (notes !== undefined) updateData.notes = notes.trim() || null;

		await db.enterpriseInquiry.update({
			where: { id: inquiryId },
			data: updateData
		});

		return { success: true };
	}
};
