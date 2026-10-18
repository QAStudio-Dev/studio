import { checkBotId } from 'botid/server';
import { error } from '@sveltejs/kit';

export const BOT_VERIFICATION_MESSAGE =
	"We couldn't verify this submission. Please refresh and try again.";

/**
 * Block automated posts on Vercel. BotID's challenge proxy is not available
 * off Vercel, and local development always classifies requests as human,
 * so the check runs only when this process is deployed on Vercel.
 */
export async function rejectBots(): Promise<void> {
	if (!process.env.VERCEL) {
		return;
	}

	const verification = await checkBotId();

	if (verification.isBot) {
		throw error(403, { message: BOT_VERIFICATION_MESSAGE });
	}
}
