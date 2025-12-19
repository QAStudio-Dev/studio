import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth, requireRole, requireCurrentSubscription } from '$lib/server/auth';
import { requireAvailableSeats } from '$lib/server/subscriptions';
import { getUserDisplayName } from '$lib/server/users';
import crypto from 'crypto';
import { createAuditLog } from '$lib/server/audit';
import { sendInvitationEmail } from '$lib/server/email';

/**
 * Invite a user to the team by email
 * POST /api/teams/[teamId]/members/invite
 */
export const POST: RequestHandler = async (event) => {
	const { teamId } = event.params;

	// Check subscription status first (blocks if CANCELED/UNPAID/etc)
	await requireCurrentSubscription(event);

	// Require OWNER, ADMIN, or MANAGER role
	const user = await requireRole(event, ['OWNER', 'ADMIN', 'MANAGER']);

	// Verify user is in this team
	if (user.teamId !== teamId) {
		throw error(403, {
			message: 'You can only invite members to your own team'
		});
	}

	const { email, role } = await event.request.json();

	if (!email || typeof email !== 'string') {
		throw error(400, {
			message: 'Email is required'
		});
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		throw error(400, {
			message: 'Invalid email format'
		});
	}

	// Validate role - OWNER role cannot be assigned via invitation
	// Only one OWNER per team (the subscription purchaser)
	const validRoles = ['ADMIN', 'MANAGER', 'TESTER', 'VIEWER'];
	const inviteRole = role || 'TESTER';
	if (!validRoles.includes(inviteRole)) {
		throw error(400, {
			message: 'Invalid role. Valid roles: ADMIN, MANAGER, TESTER, VIEWER'
		});
	}

	// Check if team has available seats
	await requireAvailableSeats(teamId);

	// Check if user is already a member of this team
	const existingMember = await db.user.findFirst({
		where: {
			email: email.toLowerCase(),
			teamId
		}
	});

	if (existingMember) {
		throw error(400, {
			message: 'User is already a member of this team'
		});
	}

	// Check if there's already a pending invitation
	const existingInvitation = await db.teamInvitation.findFirst({
		where: {
			teamId,
			email: email.toLowerCase(),
			status: 'PENDING'
		}
	});

	if (existingInvitation) {
		throw error(400, {
			message: 'An invitation has already been sent to this email address'
		});
	}

	// Generate unique invitation token
	const token = crypto.randomBytes(32).toString('hex');

	// Create invitation (expires in 7 days)
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);

	const invitation = await db.teamInvitation.create({
		data: {
			teamId,
			email: email.toLowerCase(),
			role: inviteRole,
			invitedBy: user.id,
			token,
			expiresAt
		},
		include: {
			team: {
				select: {
					name: true
				}
			}
		}
	});

	const inviteUrl = `${event.url.origin}/invitations/${token}`;

	// Send invitation email (async, don't wait)
	// Note: Email sending is fire-and-forget to avoid blocking the response
	const inviterName = getUserDisplayName(user);

	sendInvitationEmail({
		to: invitation.email,
		teamName: invitation.team.name,
		inviterName,
		role: invitation.role,
		inviteUrl,
		expiresAt: invitation.expiresAt
	}).catch((error) => {
		console.error('Failed to send invitation email:', error);
		// Don't fail the invitation creation if email fails
	});

	// Audit log invitation sent
	await createAuditLog({
		userId: user.id,
		teamId,
		action: 'TEAM_INVITATION_SENT',
		resourceType: 'TeamInvitation',
		resourceId: invitation.id,
		metadata: {
			teamName: invitation.team.name,
			inviteeEmail: invitation.email,
			role: invitation.role,
			expiresAt: invitation.expiresAt
		},
		event
	});

	return json({
		success: true,
		invitation: {
			id: invitation.id,
			email: invitation.email,
			role: invitation.role,
			inviteUrl, // Include for development/testing or manual sharing
			expiresAt: invitation.expiresAt
		}
	});
};

/**
 * List pending invitations for a team
 * GET /api/teams/[teamId]/members/invite
 */
export const GET: RequestHandler = async (event) => {
	const { teamId } = event.params;

	// Require OWNER, ADMIN, or MANAGER role
	const user = await requireRole(event, ['OWNER', 'ADMIN', 'MANAGER']);

	// Verify user is in this team
	if (user.teamId !== teamId) {
		throw error(403, {
			message: 'You can only view invitations for your own team'
		});
	}

	const invitations = await db.teamInvitation.findMany({
		where: {
			teamId,
			status: 'PENDING'
		},
		orderBy: {
			createdAt: 'desc'
		},
		select: {
			id: true,
			email: true,
			role: true,
			createdAt: true,
			expiresAt: true,
			status: true
		}
	});

	return json({ invitations });
};

/**
 * Cancel/delete a pending invitation
 * DELETE /api/teams/[teamId]/members/invite
 */
export const DELETE: RequestHandler = async (event) => {
	const { teamId } = event.params;

	// Require OWNER, ADMIN, or MANAGER role
	const user = await requireRole(event, ['OWNER', 'ADMIN', 'MANAGER']);

	// Verify user is in this team
	if (user.teamId !== teamId) {
		throw error(403, {
			message: 'You can only cancel invitations for your own team'
		});
	}

	const { invitationId } = await event.request.json();

	if (!invitationId) {
		throw error(400, {
			message: 'Invitation ID is required'
		});
	}

	// Verify invitation belongs to this team
	const invitation = await db.teamInvitation.findUnique({
		where: { id: invitationId }
	});

	if (!invitation) {
		throw error(404, {
			message: 'Invitation not found'
		});
	}

	if (invitation.teamId !== teamId) {
		throw error(403, {
			message: 'This invitation does not belong to your team'
		});
	}

	// Update status to CANCELED instead of deleting
	await db.teamInvitation.update({
		where: { id: invitationId },
		data: { status: 'CANCELED' }
	});

	// Audit log invitation revocation
	await createAuditLog({
		userId: user.id,
		teamId,
		action: 'TEAM_INVITATION_REVOKED',
		resourceType: 'TeamInvitation',
		resourceId: invitationId,
		metadata: {
			inviteeEmail: invitation.email,
			role: invitation.role
		},
		event
	});

	return json({ success: true });
};
