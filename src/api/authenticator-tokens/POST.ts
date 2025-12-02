import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { encryptTOTPSecret } from '$lib/server/totp-crypto';
import { serializeDates } from '$lib/utils/date';

export const Input = z.object({
	name: z.string().describe('Token name'),
	description: z.string().optional().describe('Token description'),
	secret: z.string().describe('Base32-encoded TOTP secret'),
	issuer: z.string().optional().describe('Issuer name'),
	accountName: z.string().optional().describe('Account name'),
	algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).optional().describe('TOTP algorithm'),
	digits: z.number().int().min(6).max(8).optional().describe('Number of digits in TOTP code'),
	period: z.number().int().positive().optional().describe('TOTP period in seconds')
});

export const Output = z.object({
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
});

export const Modifier = (r: any) => {
	r.tags = ['Authenticator Tokens'];
	r.summary = 'Create authenticator token';
	r.description =
		'Create a new authenticator token for the team. The secret will be encrypted before storage.';
	return r;
};

/**
 * POST /api/authenticator-tokens
 * Create a new authenticator token for the team
 */
export default new Endpoint({ Input, Output, Modifier }).handle(async (input, event) => {
	const userId = await requireApiAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user || !user.teamId) {
		throw error(403, 'User must be part of a team to create authenticator tokens');
	}

	// Validate secret format (Base32)
	if (!/^[A-Z2-7]+=*$/.test(input.secret)) {
		throw error(
			400,
			'Invalid secret format. Must be Base32-encoded (A-Z, 2-7, with optional padding)'
		);
	}

	// Encrypt the secret
	const encryptedSecret = encryptTOTPSecret(input.secret);

	// Create token
	const token = await db.authenticatorToken.create({
		data: {
			teamId: user.teamId,
			name: input.name,
			description: input.description,
			secret: encryptedSecret,
			issuer: input.issuer,
			accountName: input.accountName,
			algorithm: input.algorithm || 'SHA1',
			digits: input.digits || 6,
			period: input.period || 30,
			createdBy: userId
		},
		include: {
			creator: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true
				}
			}
		}
	});

	return serializeDates({
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
	});
});
