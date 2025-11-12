import { clerkClient } from 'svelte-clerk/server';
import { db } from './db';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';

/**
 * Send invitation via Clerk
 */
export async function sendInvitationWithClerk(
	teamId: string,
	email: string,
	role: UserRole,
	invitedBy: string
) {
	// Create invitation token for our system
	const token = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);

	// Create invitation in our database
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

	// Generate invitation URL
	const inviteUrl = `${process.env.PUBLIC_BASE_URL}/invitations/${token}`;

	try {
		// Send invitation via Clerk
		// Note: This requires Clerk's invitation feature to be enabled
		await clerkClient.invitations.createInvitation({
			emailAddress: email,
			redirectUrl: inviteUrl,
			publicMetadata: {
				teamId,
				role,
				invitationId: invitation.id
			}
		});

		return invitation;
	} catch (error) {
		// If Clerk invitation fails, delete our invitation
		await db.teamInvitation.delete({
			where: { id: invitation.id }
		});
		throw error;
	}
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
