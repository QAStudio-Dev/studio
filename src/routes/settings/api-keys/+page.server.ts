import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/sign-in');
	}

	const apiKeys = await db.apiKey.findMany({
		where: { userId },
		select: {
			id: true,
			name: true,
			prefix: true,
			lastUsedAt: true,
			expiresAt: true,
			createdAt: true
		},
		orderBy: {
			createdAt: 'desc'
		}
	});

	return {
		apiKeys
	};
};
