import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	isValidEmail,
	parseIntInRange,
	VALIDATION_LIMITS,
	isValidInquiryStatus
} from '$lib/server/validation';
import { requireRole } from '$lib/server/auth';
import { createAuditLog } from '$lib/server/audit';
import { TeamPlan, type Prisma } from '$prisma/client';

export const load: PageServerLoad = async (event) => {
	// Require OWNER role to access admin panel
	await requireRole(event, ['OWNER']);

	// Get pagination parameters from URL
	const url = new URL(event.request.url);
	const teamsPage = parseInt(url.searchParams.get('teamsPage') || '1');
	const inquiriesPage = parseInt(url.searchParams.get('inquiriesPage') || '1');
	const pageSize = 50; // Items per page

	// Fetch teams with pagination
	const [teams, teamsCount] = await Promise.all([
		db.team.findMany({
			take: pageSize,
			skip: (teamsPage - 1) * pageSize,
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
		}),
		db.team.count()
	]);

	// Fetch enterprise inquiries with pagination
	const [inquiries, inquiriesCount] = await Promise.all([
		db.enterpriseInquiry.findMany({
			take: pageSize,
			skip: (inquiriesPage - 1) * pageSize,
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
		}),
		db.enterpriseInquiry.count()
	]);

	return {
		teams,
		teamsCount,
		teamsPage,
		teamsTotalPages: Math.ceil(teamsCount / pageSize),
		inquiries,
		inquiriesCount,
		inquiriesPage,
		inquiriesTotalPages: Math.ceil(inquiriesCount / pageSize),
		pageSize
	};
};

export const actions: Actions = {
	upgradeToPlan: async (event) => {
		// Require OWNER role
		const userId = await requireRole(event, ['OWNER']);

		const { request } = event;

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

		// Validate plan value - use actual enum value instead of type casting for safety
		const planValue = TeamPlan[plan as keyof typeof TeamPlan];
		if (!planValue) {
			return fail(400, { error: 'Invalid plan value' });
		}

		// Get team before update for audit trail
		const team = await db.team.findUnique({
			where: { id: teamId },
			select: { id: true, name: true, plan: true }
		});

		if (!team) {
			return fail(404, { error: 'Team not found' });
		}

		const updateData: Prisma.TeamUpdateInput = {
			plan: planValue
		};

		// Add enterprise-specific fields
		if (planValue === TeamPlan.ENTERPRISE) {
			// Validate and parse custom seats
			if (customSeats) {
				const parsed = parseIntInRange(
					customSeats,
					VALIDATION_LIMITS.SEATS_MIN,
					VALIDATION_LIMITS.SEATS_MAX
				);
				if (parsed === null) {
					return fail(400, {
						error: `Custom seats must be a positive number between ${VALIDATION_LIMITS.SEATS_MIN} and ${VALIDATION_LIMITS.SEATS_MAX.toLocaleString()}`
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
				const trimmed = accountManager.trim();
				if (trimmed && !isValidEmail(trimmed)) {
					return fail(400, { error: 'Invalid account manager email address' });
				}
				updateData.accountManager = trimmed;
			}

			// Validate invoice email
			if (invoiceEmail) {
				const trimmed = invoiceEmail.trim();
				if (trimmed && !isValidEmail(trimmed)) {
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

		// Audit log the plan change
		await createAuditLog({
			userId,
			teamId,
			action: 'TEAM_PLAN_CHANGED',
			resourceType: 'Team',
			resourceId: teamId,
			metadata: {
				teamName: team.name,
				oldPlan: team.plan,
				newPlan: planValue,
				customSeats: updateData.customSeats,
				contractEnd: updateData.contractEnd,
				accountManager: updateData.accountManager,
				invoiceEmail: updateData.invoiceEmail
			},
			event
		});

		return { success: true };
	},

	updateInquiryStatus: async (event) => {
		// Require OWNER role
		const userId = await requireRole(event, ['OWNER']);

		const { request } = event;

		const data = await request.formData();
		const inquiryId = data.get('inquiryId') as string;
		const status = data.get('status') as string;
		const assignedTo = data.get('assignedTo') as string;
		const notes = data.get('notes') as string;

		if (!inquiryId) {
			return fail(400, { error: 'Inquiry ID is required' });
		}

		// Get inquiry before update for audit trail
		const inquiry = await db.enterpriseInquiry.findUnique({
			where: { id: inquiryId },
			select: { id: true, companyName: true, email: true, status: true, teamId: true }
		});

		if (!inquiry) {
			return fail(404, { error: 'Inquiry not found' });
		}

		// Validate status if provided
		if (status && !isValidInquiryStatus(status)) {
			return fail(400, { error: 'Invalid status value' });
		}

		const updateData: Prisma.EnterpriseInquiryUpdateInput = {};
		if (status) updateData.status = status;
		if (assignedTo) updateData.assignedTo = assignedTo.trim();
		if (notes !== undefined) updateData.notes = notes.trim() || null;

		await db.enterpriseInquiry.update({
			where: { id: inquiryId },
			data: updateData
		});

		// Audit log the inquiry status change
		await createAuditLog({
			userId,
			teamId: inquiry.teamId || undefined,
			action: 'ENTERPRISE_INQUIRY_UPDATED',
			resourceType: 'EnterpriseInquiry',
			resourceId: inquiryId,
			metadata: {
				companyName: inquiry.companyName,
				email: inquiry.email,
				oldStatus: inquiry.status,
				newStatus: status || inquiry.status,
				assignedTo: assignedTo || undefined,
				notesUpdated: notes !== undefined
			},
			event
		});

		return { success: true };
	}
};
