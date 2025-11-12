import { clerkClient } from 'svelte-clerk/server';
import { db } from './db';

/**
 * Get user from database, sync from Clerk if not found
 */
export async function getUser(userId: string) {
	try {
		// Try to get from database first
		let user = await db.user.findUnique({
			where: { id: userId },
			include: { team: true }
		});

		// If not in database, sync from Clerk
		if (!user) {
			user = await syncUserFromClerk(userId);
		}

		return user;
	} catch (error) {
		console.error('Error fetching user:', error);
		return null;
	}
}

/**
 * Sync user from Clerk to database
 */
export async function syncUserFromClerk(userId: string) {
	try {
		const clerkUser = await clerkClient.users.getUser(userId);

		const user = await db.user.upsert({
			where: { id: userId },
			create: {
				id: clerkUser.id,
				email: clerkUser.emailAddresses[0]?.emailAddress || '',
				firstName: clerkUser.firstName,
				lastName: clerkUser.lastName,
				imageUrl: clerkUser.imageUrl,
				role: 'TESTER' // Default role
			},
			update: {
				email: clerkUser.emailAddresses[0]?.emailAddress || '',
				firstName: clerkUser.firstName,
				lastName: clerkUser.lastName,
				imageUrl: clerkUser.imageUrl
			},
			include: {
				team: true
			}
		});

		return user;
	} catch (error) {
		console.error('Error syncing user from Clerk:', error);
		return null;
	}
}

/**
 * Get or create user (ensures user exists in database)
 */
export async function ensureUser(userId: string) {
	const user = await getUser(userId);
	if (!user) {
		return await syncUserFromClerk(userId);
	}
	return user;
}

/**
 * Get multiple users from database
 */
export async function getUsers(userIds: string[]) {
	try {
		const uniqueIds = [...new Set(userIds)];
		const users = await db.user.findMany({
			where: { id: { in: uniqueIds } },
			include: { team: true }
		});

		// Create a map for easy lookup
		return users.reduce(
			(acc, user) => {
				acc[user.id] = user;
				return acc;
			},
			{} as Record<string, any>
		);
	} catch (error) {
		console.error('Error fetching users:', error);
		return {};
	}
}
