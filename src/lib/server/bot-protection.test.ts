import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

const { checkBotId } = vi.hoisted(() => ({
	checkBotId: vi.fn()
}));

vi.mock('botid/server', () => ({
	checkBotId
}));

import { BOT_VERIFICATION_MESSAGE, rejectBots } from './bot-protection';

describe('rejectBots', () => {
	const originalVercel = process.env.VERCEL;

	beforeEach(() => {
		checkBotId.mockReset();
		delete process.env.VERCEL;
	});

	afterEach(() => {
		if (originalVercel === undefined) {
			delete process.env.VERCEL;
		} else {
			process.env.VERCEL = originalVercel;
		}
	});

	it('skips BotID when the app is not running on Vercel', async () => {
		await rejectBots();

		expect(checkBotId).not.toHaveBeenCalled();
	});

	it('allows the request when Vercel classifies it as human', async () => {
		process.env.VERCEL = '1';
		checkBotId.mockResolvedValue({
			isBot: false,
			isHuman: true,
			isVerifiedBot: false,
			bypassed: false
		});

		await rejectBots();

		expect(checkBotId).toHaveBeenCalledOnce();
	});

	it('rejects a classified bot with a form-visible 403', async () => {
		process.env.VERCEL = '1';
		checkBotId.mockResolvedValue({
			isBot: true,
			isHuman: false,
			isVerifiedBot: false,
			bypassed: false
		});

		try {
			await rejectBots();
			expect.fail('expected a bot rejection');
		} catch (err) {
			expect(isHttpError(err, 403)).toBe(true);
			if (isHttpError(err)) {
				expect(err.body.message).toBe(BOT_VERIFICATION_MESSAGE);
			}
		}
	});
});
