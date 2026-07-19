import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import PATCH_ENDPOINT, { Input, Param } from '../../../../api/cases/[...testCaseId]/PATCH';

const endpointHandler = PATCH_ENDPOINT.default;

type CasePatchInput = Parameters<typeof endpointHandler>[0];
type CasePatchResult = Awaited<ReturnType<typeof endpointHandler>>;

/** Mirrors sveltekit-api body + param validation before invoking the route handler. */
async function PATCH(event: {
	request: Request;
	params: { testCaseId: string };
}): Promise<CasePatchResult> {
	const body = await event.request.json();
	const param = Param.parse({ testCaseId: event.params.testCaseId });
	const validation = Input.safeParse({ ...body, ...param });
	if (!validation.success) {
		throw validation.error;
	}
	const input = { ...validation.data, ...param } as CasePatchInput;
	return endpointHandler(input, event as Parameters<typeof endpointHandler>[1]);
}

vi.mock('$lib/server/db', () => ({
	db: {
		testCase: {
			findUnique: vi.fn(),
			update: vi.fn()
		}
	}
}));

vi.mock('$lib/server/api-auth', () => ({
	requireApiAuth: vi.fn()
}));

vi.mock('$lib/utils/date', () => ({
	serializeDates: vi.fn((obj) => obj)
}));

import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';

describe('PATCH /api/cases/[testCaseId]', () => {
	const existingTestCase = {
		id: 'tc_123',
		title: 'Existing case',
		project: { id: 'proj_123', createdBy: 'user_123' }
	};

	const updatedBase = {
		id: 'tc_123',
		title: 'Existing case',
		description: null,
		preconditions: null,
		steps: null,
		expectedResult: null,
		priority: 'MEDIUM' as const,
		type: 'FUNCTIONAL' as const,
		automationStatus: 'NOT_AUTOMATED' as const,
		tags: [] as string[],
		projectId: 'proj_123',
		suiteId: null,
		createdBy: 'user_123',
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-02T00:00:00Z'),
		project: { id: 'proj_123', name: 'Demo', key: 'DEMO' },
		suite: null,
		creator: {
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			imageUrl: null
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(requireApiAuth).mockResolvedValue('user_123');
		vi.mocked(db.testCase.findUnique).mockResolvedValue(existingTestCase as never);
		vi.mocked(db.testCase.update).mockResolvedValue(updatedBase as never);
	});

	function makeEvent(body: Record<string, unknown>) {
		return {
			request: new Request('http://localhost/api/cases/tc_123', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			}),
			params: { testCaseId: 'tc_123' },
			url: new URL('http://localhost/api/cases/tc_123'),
			locals: {},
			cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), serialize: vi.fn() },
			fetch: vi.fn(),
			getClientAddress: vi.fn(),
			isDataRequest: false,
			route: { id: '/api/cases/[...testCaseId]' },
			setHeaders: vi.fn()
		};
	}

	it('persists structured steps as a JSON array with order filled', async () => {
		const structuredSteps = [
			{ action: 'Open the app', expectedResult: 'Welcome screen is shown' },
			{ action: 'Tap Login', expectedResult: 'Login screen is shown', order: 1 }
		];
		vi.mocked(db.testCase.update).mockResolvedValue({
			...updatedBase,
			steps: [
				{ action: 'Open the app', expectedResult: 'Welcome screen is shown', order: 0 },
				{ action: 'Tap Login', expectedResult: 'Login screen is shown', order: 1 }
			]
		} as never);

		const result = await PATCH(makeEvent({ steps: structuredSteps }));

		expect(db.testCase.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					steps: [
						{
							action: 'Open the app',
							expectedResult: 'Welcome screen is shown',
							order: 0
						},
						{ action: 'Tap Login', expectedResult: 'Login screen is shown', order: 1 }
					]
				})
			})
		);
		expect(result.steps).toHaveLength(2);
	});

	it('still accepts legacy plain-text steps', async () => {
		vi.mocked(db.testCase.update).mockResolvedValue({
			...updatedBase,
			steps: 'Step 1\nStep 2'
		} as never);

		const result = await PATCH(makeEvent({ steps: 'Step 1\nStep 2' }));

		expect(db.testCase.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					steps: 'Step 1\nStep 2'
				})
			})
		);
		expect(result.steps).toBe('Step 1\nStep 2');
	});

	it('clears steps when null or blank string is sent', async () => {
		await PATCH(makeEvent({ steps: null }));
		const nullClearSteps = vi.mocked(db.testCase.update).mock.calls[0]?.[0]?.data?.steps;
		// Prisma.JsonNull is an object enum sentinel, not JS null / string / array
		expect(nullClearSteps).toBeTruthy();
		expect(typeof nullClearSteps).toBe('object');
		expect(Array.isArray(nullClearSteps)).toBe(false);
		expect(String(nullClearSteps)).toMatch(/JsonNull/);

		vi.clearAllMocks();
		vi.mocked(requireApiAuth).mockResolvedValue('user_123');
		vi.mocked(db.testCase.findUnique).mockResolvedValue(existingTestCase as never);
		vi.mocked(db.testCase.update).mockResolvedValue(updatedBase as never);

		await PATCH(makeEvent({ steps: '   ' }));
		const blankClearSteps = vi.mocked(db.testCase.update).mock.calls[0]?.[0]?.data?.steps;
		expect(String(blankClearSteps)).toMatch(/JsonNull/);
	});

	it('rejects structured steps with empty action', async () => {
		await expect(
			PATCH(
				makeEvent({
					steps: [{ action: '', expectedResult: 'Result' }]
				})
			)
		).rejects.toBeInstanceOf(ZodError);
	});

	it('rejects structured steps arrays longer than 100', async () => {
		await expect(
			PATCH(
				makeEvent({
					steps: Array(101).fill({ action: 'Step', expectedResult: 'Result' })
				})
			)
		).rejects.toBeInstanceOf(ZodError);
	});

	it('rejects negative step order', async () => {
		await expect(
			PATCH(
				makeEvent({
					steps: [{ action: 'Step 1', expectedResult: 'Result', order: -1 }]
				})
			)
		).rejects.toBeInstanceOf(ZodError);
	});

	it('returns 404 when the test case does not exist', async () => {
		vi.mocked(db.testCase.findUnique).mockResolvedValue(null);
		await expect(PATCH(makeEvent({ title: 'Nope' }))).rejects.toMatchObject({
			status: 404
		});
	});
});
