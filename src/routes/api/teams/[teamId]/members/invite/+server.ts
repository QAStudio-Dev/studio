import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth, requireRole } from '$lib/server/auth';
import { requireAvailableSeats } from '$lib/server/subscriptions';
import { clerkClient } from 'svelte-clerk/server';

/**
 * Invite a user to the team by email
 * POST /api/teams/[teamId]/members/invite
 */
export const POST: RequestHandler = async (event) => {
	const { teamId } = event.params;

	// Require ADMIN or MANAGER role
	const user = await requireRole(event, ['ADMIN', 'MANAGER']);

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

	// Validate role
	const validRoles = ['ADMIN', 'MANAGER', 'TESTER', 'VIEWER'];
	if (role && !validRoles.includes(role)) {
		throw error(400, {
			message: 'Invalid role'
		});
	}

	// Check if team has available seats
	await requireAvailableSeats(teamId);

	// Check if user exists in Clerk
	let clerkUser;
	try {
		const users = await clerkClient.users.getUserList({
			emailAddress: [email]
		});

		if (users.data.length === 0) {
			throw error(404, {
				message: 'User not found. They must sign up first before being invited.'
			});
		}

		clerkUser = users.data[0];
	} catch (err: any) {
		throw error(500, {
			message: 'Failed to find user'
		});
	}

	// Check if user already exists in our database
	let dbUser = await db.user.findUnique({
		where: { id: clerkUser.id }
	});

	// If user doesn't exist in our DB, create them
	if (!dbUser) {
		dbUser = await db.user.create({
			data: {
				id: clerkUser.id,
				email: clerkUser.emailAddresses[0]?.emailAddress || email,
				firstName: clerkUser.firstName,
				lastName: clerkUser.lastName,
				imageUrl: clerkUser.imageUrl,
				role: role || 'TESTER'
			}
		});
	}

	// Check if user is already in a team
	if (dbUser.teamId) {
		if (dbUser.teamId === teamId) {
			throw error(400, {
				message: 'User is already a member of this team'
			});
		}
		throw error(400, {
			message: 'User is already a member of another team'
		});
	}

	// Add user to team
	await db.user.update({
		where: { id: dbUser.id },
		data: {
			teamId,
			role: role || dbUser.role
		}
	});

	// TODO: Send invitation email via Clerk or custom email service

	return json({
		success: true,
		member: {
			id: dbUser.id,
			email: dbUser.email,
			firstName: dbUser.firstName,
			lastName: dbUser.lastName,
			role: role || dbUser.role
		}
	});
};
