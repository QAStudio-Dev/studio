import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { encryptTOTPSecret } from '$lib/server/totp-crypto';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	id: z.string().describe('Token ID')
});

export const Input = z.object({
	name: z.string().optional().describe('Token name'),
	description: z.string().optional().describe('Token description'),
	secret: z.string().optional().describe('Base32-encoded TOTP secret'),
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
	r.summary = 'Update authenticator token';
	r.description = 'Update an authenticator token. All fields are optional.';
	return r;
};

/**
 * PATCH /api/authenticator-tokens/:id
 * Update an authenticator token
 */
export default new Endpoint({ Param, Input, Output, Modifier }).handle(async (input, event) => {
	const userId = await requireApiAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user || !user.teamId) {
		throw error(403, 'User must be part of a team to update authenticator tokens');
	}

	// Check token exists and belongs to user's team
	const existingToken = await db.authenticatorToken.findFirst({
		where: {
			id: input.id,
			teamId: user.teamId
		}
	});

	if (!existingToken) {
		throw error(404, 'Authenticator token not found');
	}

	// Validate secret format if provided
	if (input.secret && !/^[A-Z2-7]+=*$/.test(input.secret)) {
		throw error(
			400,
			'Invalid secret format. Must be Base32-encoded (A-Z, 2-7, with optional padding)'
		);
	}

	// Prepare update data
	const updateData: any = {};
	if (input.name !== undefined) updateData.name = input.name;
	if (input.description !== undefined) updateData.description = input.description;
	if (input.secret !== undefined) updateData.secret = encryptTOTPSecret(input.secret);
	if (input.issuer !== undefined) updateData.issuer = input.issuer;
	if (input.accountName !== undefined) updateData.accountName = input.accountName;
	if (input.algorithm !== undefined) updateData.algorithm = input.algorithm;
	if (input.digits !== undefined) updateData.digits = input.digits;
	if (input.period !== undefined) updateData.period = input.period;

	// Update token
	const token = await db.authenticatorToken.update({
		where: { id: input.id },
		data: updateData,
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
