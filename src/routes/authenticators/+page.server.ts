import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.userId) {
		throw redirect(302, '/login');
	}

	// Get user with team
	const user = await db.user.findUnique({
		where: { id: locals.userId },
		include: {
			team: {
				include: {
					authenticatorTokens: {
						include: {
							creator: {
								select: {
									id: true,
									email: true,
									firstName: true,
									lastName: true
								}
							}
						},
						orderBy: { createdAt: 'desc' }
					}
				}
			}
		}
	});

	// User must be part of a team
	if (!user?.team) {
		throw redirect(302, '/teams/new');
	}

	return {
		tokens: user.team.authenticatorTokens.map((token) => ({
			id: token.id,
			name: token.name,
			description: token.description,
			issuer: token.issuer,
			accountName: token.accountName,
			algorithm: token.algorithm,
			digits: token.digits,
			period: token.period,
			createdBy: token.creator,
			createdAt: token.createdAt.toISOString(),
			updatedAt: token.updatedAt.toISOString()
		})),
		teamName: user.team.name
	};
};
