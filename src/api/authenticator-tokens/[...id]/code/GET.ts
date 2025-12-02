import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { generateTOTPCode, getTimeRemaining } from '$lib/server/totp';

export const Param = z.object({
	id: z.string().describe('Token ID')
});

export const Output = z.object({
	code: z.string().describe('Current TOTP code'),
	timeRemaining: z.number().describe('Seconds until next code'),
	period: z.number().describe('TOTP period in seconds'),
	digits: z.number().describe('Number of digits in code'),
	tokenId: z.string().describe('Token ID'),
	tokenName: z.string().describe('Token name')
});

export const Modifier = (r: any) => {
	r.tags = ['Authenticator Tokens'];
	r.summary = 'Generate TOTP code';
	r.description =
		'Generate the current TOTP code for an authenticator token. The code rotates based on the configured period.';
	return r;
};

/**
 * GET /api/authenticator-tokens/:id/code
 * Generate current TOTP code for an authenticator token
 */
export default new Endpoint({ Param, Output, Modifier }).handle(async (input, event) => {
	const userId = await requireApiAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user || !user.teamId) {
		throw error(403, 'User must be part of a team to access authenticator tokens');
	}

	const token = await db.authenticatorToken.findFirst({
		where: {
			id: input.id,
			teamId: user.teamId
		}
	});

	if (!token) {
		throw error(404, 'Authenticator token not found');
	}

	// Generate current TOTP code
	const code = generateTOTPCode({
		secret: token.secret,
		issuer: token.issuer || undefined,
		accountName: token.accountName || undefined,
		algorithm: token.algorithm as 'SHA1' | 'SHA256' | 'SHA512',
		digits: token.digits,
		period: token.period
	});

	// Get time remaining until next code
	const timeRemaining = getTimeRemaining(token.period);

	return {
		code,
		timeRemaining,
		period: token.period,
		digits: token.digits,
		tokenId: token.id,
		tokenName: token.name
	};
});
