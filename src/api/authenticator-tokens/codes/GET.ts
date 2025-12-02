import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { generateTOTPCode, getTimeRemaining } from '$lib/server/totp';

export const Output = z.record(
	z.string(),
	z.object({
		code: z.string().describe('Current TOTP code'),
		timeRemaining: z.number().describe('Seconds until next code'),
		period: z.number().describe('TOTP period in seconds'),
		digits: z.number().describe('Number of digits in code'),
		tokenId: z.string().describe('Token ID'),
		tokenName: z.string().describe('Token name')
	})
);

export const Modifier = (r: any) => {
	r.tags = ['Authenticator Tokens'];
	r.summary = 'Generate TOTP codes for all team tokens';
	r.description =
		"Generate current TOTP codes for all authenticator tokens belonging to the user's team. Returns a map of token IDs to their TOTP codes. This is more efficient than calling the individual code endpoint for each token.";
	return r;
};

/**
 * GET /api/authenticator-tokens/codes
 * Generate current TOTP codes for all team tokens
 * Returns: { [tokenId]: { code, timeRemaining, period, digits, tokenId, tokenName } }
 */
export default new Endpoint({ Output, Modifier }).handle(async (input, event) => {
	const userId = await requireApiAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user || !user.teamId) {
		throw error(403, 'User must be part of a team to access authenticator tokens');
	}

	// Fetch all tokens for the team in a single query
	const tokens = await db.authenticatorToken.findMany({
		where: {
			teamId: user.teamId
		},
		orderBy: {
			name: 'asc'
		}
	});

	// Generate codes for all tokens
	const result: Record<
		string,
		{
			code: string;
			timeRemaining: number;
			period: number;
			digits: number;
			tokenId: string;
			tokenName: string;
		}
	> = {};

	for (const token of tokens) {
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

		result[token.id] = {
			code,
			timeRemaining,
			period: token.period,
			digits: token.digits,
			tokenId: token.id,
			tokenName: token.name
		};
	}

	return result;
});
