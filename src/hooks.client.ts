import { initBotId } from 'botid/client/core';
import type { ClientInit } from '@sveltejs/kit';

/**
 * Attach BotID headers to the public form posts that attract spam.
 * Server routes reject the request when Vercel classifies it as a bot.
 */
export const init: ClientInit = () => {
	initBotId({
		protect: [
			{
				path: '/api/enterprise-inquiries',
				method: 'POST'
			},
			{
				path: '/api/auth/signup',
				method: 'POST'
			}
		]
	});
};
