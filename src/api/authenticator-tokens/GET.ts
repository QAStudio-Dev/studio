import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Output = z
	.object({
		id: z.string().describe('Token ID'),
		name: z.string().describe('Token name'),
		description: z.string().nullable().describe('Token description'),
		issuer: z.string().nullable().describe('Issuer name'),
		accountName: z.string().nullable().describe('Account name'),
		algorithm: z.string().describe('TOTP algorithm (SHA1, SHA256, SHA512)'),
		digits: z.number().describe('Number of digits in TOTP code'),
		period: z.number().describe('TOTP period in seconds'),
		createdBy: z
			.object({
				id: z.string(),
				email: z.string(),
				firstName: z.string().nullable(),
				lastName: z.string().nullable()
			})
			.describe('User who created the token'),
		createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
		updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp')
	})
	.array();

export const Modifier = (r: any) => {
	r.tags = ['Authenticator Tokens'];
	r.summary = 'List authenticator tokens';
	r.description =
		"Get all authenticator tokens for the authenticated user's team. The secret is never returned for security.";
	return r;
};

/**
 * GET /api/authenticator-tokens
 * List all authenticator tokens for the team
 */
export default new Endpoint({ Output, Modifier }).handle(async (input, event) => {
	const userId = await requireApiAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user || !user.teamId) {
		throw new Error('User must be part of a team to access authenticator tokens');
	}

	const tokens = await db.authenticatorToken.findMany({
		where: { teamId: user.teamId },
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
	});

	return tokens.map((token) =>
		serializeDates({
			id: token.id,
			name: token.name,
			description: token.description,
			issuer: token.issuer,
			accountName: token.accountName,
			algorithm: token.algorithm,
			digits: token.digits,
			period: token.period,
			createdBy: token.creator,
			createdAt: token.createdAt,
			updatedAt: token.updatedAt
		})
	);
});
