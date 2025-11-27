import { db } from './db';
import crypto from 'crypto';
import { UserRole } from '$prisma/client';

/**
 * Send invitation via email (to be implemented)
 * For now, returns the invitation with URL to be shared manually
 */
export async function sendInvitationEmail(
	teamId: string,
	email: string,
	role: UserRole,
	invitedBy: string
) {
	const token = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);

	const invitation = await db.teamInvitation.create({
		data: {
			teamId,
			email: email.toLowerCase(),
			role,
			invitedBy,
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

	const inviteUrl = `${process.env.PUBLIC_BASE_URL}/invitations/${token}`;

	// TODO: Send email with invitation link
	// For now, log to console
	console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Team Invitation Created
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Team: ${invitation.team.name}
Email: ${email}
Role: ${role}

Invitation Link:
${inviteUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	`);

	return invitation;
}

/**
 * Alternative: Generate invitation link for manual sharing
 * (Use this if you don't want to send emails yet)
 */
export async function createInvitationLink(
	teamId: string,
	email: string,
	role: UserRole,
	invitedBy: string
) {
	const token = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);

	const invitation = await db.teamInvitation.create({
		data: {
			teamId,
			email: email.toLowerCase(),
			role,
			invitedBy,
			token,
			expiresAt
		}
	});

	const inviteUrl = `${process.env.PUBLIC_BASE_URL}/invitations/${token}`;

	return {
		invitation,
		inviteUrl
	};
}
