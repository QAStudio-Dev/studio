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
		$transaction: vi.fn(),
		enterpriseInquiry: {
			findFirst: vi.fn(),
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
	verifyCsrfToken: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	getAuthenticatedUser: vi.fn()
}));

vi.mock('$lib/server/email', () => ({
	sendEnterpriseInquiryEmail: vi.fn()
}));

import { POST } from '../../../routes/api/enterprise-inquiries/+server';
import { BOT_VERIFICATION_MESSAGE } from '$lib/server/bot-protection';
import { db } from '$lib/server/db';
import { getAuthenticatedUser } from '$lib/server/auth';

function inquiryEvent(): Parameters<typeof POST>[0] {
	return {
		request: new Request('http://localhost/api/enterprise-inquiries', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ companyName: 'Spam Co', email: 'bot@example.com' })
		})
	} as Parameters<typeof POST>[0];
}

describe('POST /api/enterprise-inquiries bot protection', () => {
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

	it('rejects bots on Vercel before creating an inquiry', async () => {
		process.env.VERCEL = '1';
		checkBotId.mockResolvedValue({
			isBot: true,
			isHuman: false,
			isVerifiedBot: false,
			bypassed: false
		});

		try {
			await POST(inquiryEvent());
			expect.fail('expected a bot rejection');
		} catch (err) {
			expect(isHttpError(err, 403)).toBe(true);
			if (isHttpError(err)) {
				expect(err.body.message).toBe(BOT_VERIFICATION_MESSAGE);
			}
		}

		expect(getAuthenticatedUser).not.toHaveBeenCalled();
		expect(db.$transaction).not.toHaveBeenCalled();
		expect(db.enterpriseInquiry.create).not.toHaveBeenCalled();
	});

	it('still accepts the request path when BotID classifies a human', async () => {
		process.env.VERCEL = '1';
		checkBotId.mockResolvedValue({
			isBot: false,
			isHuman: true,
			isVerifiedBot: false,
			bypassed: false
		});
		vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

		try {
			await POST(inquiryEvent());
			expect.fail('expected validation to continue');
		} catch (err) {
			expect(isHttpError(err, 400)).toBe(true);
		}

		expect(checkBotId).toHaveBeenCalledOnce();
		expect(getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(db.enterpriseInquiry.create).not.toHaveBeenCalled();
	});
});
