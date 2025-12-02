import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { generateTOTPCode, getTimeRemaining } from '$lib/server/totp';
import { Ratelimit } from '@upstash/ratelimit';
import { redis, isCacheEnabled } from '$lib/server/redis';

/**
 * Rate limiting for TOTP code generation
 * Uses Redis in production, falls back to in-memory for development
 */
let ratelimit: Ratelimit | null = null;
const codeGenAttemptsMemory = new Map<string, { count: number; resetAt: number }>();

// Initialize rate limiter if Redis is available
if (isCacheEnabled) {
	ratelimit = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute per user
		analytics: true,
		prefix: 'ratelimit:totp:codes'
	});
}

async function checkRateLimit(userId: string): Promise<boolean> {
	// Use Redis rate limiting if available
	if (ratelimit) {
		const { success } = await ratelimit.limit(userId);
		return success;
	}

	// Fallback to in-memory rate limiting for development
	const now = Date.now();
	const attempt = codeGenAttemptsMemory.get(userId);

	if (!attempt || now > attempt.resetAt) {
		// Reset or create new entry
		codeGenAttemptsMemory.set(userId, { count: 1, resetAt: now + 60 * 1000 }); // 1 minute
		return true;
	}

	if (attempt.count >= 20) {
		// Too many attempts
		return false;
	}

	// Increment count
	attempt.count++;
	return true;
}

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

	// Check rate limit
	const allowed = await checkRateLimit(userId);
	if (!allowed) {
		throw error(429, 'Too many TOTP code generation requests. Please try again later.');
	}

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

	// Generate codes for all tokens in parallel
	const codePromises = tokens.map(async (token) => {
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

		return [
			token.id,
			{
				code,
				timeRemaining,
				period: token.period,
				digits: token.digits,
				tokenId: token.id,
				tokenName: token.name
			}
		] as const;
	});

	// Wait for all codes to be generated
	const codeEntries = await Promise.all(codePromises);

	// Convert array of entries to record
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
	> = Object.fromEntries(codeEntries);

	return result;
});
