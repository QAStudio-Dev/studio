import { db } from './db';

/**
 * Get user from database
 */
export async function getUser(userId: string) {
	try {
		const user = await db.user.findUnique({
			where: { id: userId },
			include: { team: true }
		});

		return user;
	} catch (error) {
		console.error('Error fetching user:', error);
		return null;
	}
}

/**
 * Get or create user (ensures user exists in database)
 * Note: With self-hosted auth, users are created during signup, so this just fetches them
 */
export async function ensureUser(userId: string) {
	return await getUser(userId);
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

/**
 * Get display name for a user
 * Returns full name if available, otherwise email
 */
export function getUserDisplayName(user: {
	firstName?: string | null;
	lastName?: string | null;
	email: string;
}): string {
	if (!user.firstName && !user.lastName) {
		return user.email;
	}

	const parts: string[] = [];
	if (user.firstName) parts.push(user.firstName);
	if (user.lastName) parts.push(user.lastName);

	return parts.join(' ');
}
