import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

const { checkBotId } = vi.hoisted(() => ({
	checkBotId: vi.fn()
}));

vi.mock('botid/server', () => ({
	checkBotId
}));

vi.mock('$lib/server/db', () => ({
	db: {
		user: {
			findUnique: vi.fn(),
			create: vi.fn()
		}
	}
}));

vi.mock('$lib/server/redis', () => ({
	redis: {},
	isCacheEnabled: true
}));

vi.mock('@upstash/ratelimit', () => ({
	Ratelimit: class {
		static slidingWindow() {
			return {};
		}
		limit() {
			return Promise.resolve({ success: true });
		}
	}
}));

vi.mock('$lib/server/sessions', () => ({
	createSession: vi.fn(),
	setSessionCookie: vi.fn(),
	verifyCsrfToken: vi.fn()
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

vi.mock('$lib/server/email', () => ({
	sendWelcomeEmail: vi.fn()
}));

import { POST } from '../../../../routes/api/auth/signup/+server';
import { BOT_VERIFICATION_MESSAGE } from '$lib/server/bot-protection';
import { db } from '$lib/server/db';
import { verifyCsrfToken } from '$lib/server/sessions';

function signupEvent(body: unknown): Parameters<typeof POST>[0] {
	return {
		request: new Request('http://localhost/api/auth/signup', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as Parameters<typeof POST>[0];
}

describe('POST /api/auth/signup bot protection', () => {
	const originalVercel = process.env.VERCEL;

	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.VERCEL;
	});

	afterEach(() => {
		if (originalVercel === undefined) {
			delete process.env.VERCEL;
		} else {
			process.env.VERCEL = originalVercel;
		}
	});

	it('rejects bots on Vercel before creating a user', async () => {
		process.env.VERCEL = '1';
		checkBotId.mockResolvedValue({
			isBot: true,
			isHuman: false,
			isVerifiedBot: false,
			bypassed: false
		});

		try {
			await POST(signupEvent({ email: 'bot@example.com', password: 'Password1' }));
			expect.fail('expected a bot rejection');
		} catch (err) {
			expect(isHttpError(err, 403)).toBe(true);
			if (isHttpError(err)) {
				expect(err.body.message).toBe(BOT_VERIFICATION_MESSAGE);
			}
		}

		expect(verifyCsrfToken).not.toHaveBeenCalled();
		expect(db.user.findUnique).not.toHaveBeenCalled();
		expect(db.user.create).not.toHaveBeenCalled();
	});

	it('still reaches CSRF validation when BotID is not enforced', async () => {
		vi.mocked(verifyCsrfToken).mockReturnValue(false);

		try {
			await POST(
				signupEvent({
					email: 'person@example.com',
					password: 'Password1',
					csrfToken: 'token'
				})
			);
			expect.fail('expected a CSRF rejection');
		} catch (err) {
			expect(isHttpError(err, 403)).toBe(true);
			if (isHttpError(err)) {
				expect(err.body.message).toBe('Invalid CSRF token');
			}
		}

		expect(checkBotId).not.toHaveBeenCalled();
		expect(db.user.create).not.toHaveBeenCalled();
	});
});
