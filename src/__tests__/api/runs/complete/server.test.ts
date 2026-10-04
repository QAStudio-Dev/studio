import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		testRun: {
			findUnique: vi.fn(),
			update: vi.fn()
		},
		user: {
			findUnique: vi.fn()
		},
		testResult: {
			groupBy: vi.fn()
		}
	}
}));

vi.mock('$lib/server/api-auth', () => ({
	requireApiAuth: vi.fn(() => Promise.resolve('user123'))
}));

vi.mock('$lib/server/integrations', () => ({
	notifyTestRunCompleted: vi.fn(),
	notifyTestRunFailed: vi.fn()
}));

vi.mock('$lib/server/redis', () => ({
	deleteCache: vi.fn(),
	CacheKeys: {
		testRun: (id: string) => `run:${id}`,
		testResults: (id: string) => `results:${id}`,
		project: (id: string) => `project:${id}`
	}
}));

vi.mock('@vercel/functions', () => ({
	waitUntil: vi.fn()
}));

import { POST } from '../../../../routes/api/runs/[...runId]/complete/+server';
import { db } from '$lib/server/db';
import { notifyTestRunCompleted, notifyTestRunFailed } from '$lib/server/integrations';
import { waitUntil } from '@vercel/functions';

describe('POST /api/runs/[runId]/complete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(db.testRun.findUnique).mockResolvedValue({
			id: 'run1',
			name: 'Nightly',
			projectId: 'proj1',
			project: {
				id: 'proj1',
				name: 'App',
				teamId: 'team1',
				createdBy: 'user123'
			}
		} as any);
		vi.mocked(db.user.findUnique).mockResolvedValue({ teamId: 'team1' } as any);
		vi.mocked(db.testRun.update).mockResolvedValue({
			id: 'run1',
			status: 'COMPLETED'
		} as any);
		vi.mocked(db.testResult.groupBy).mockResolvedValue([
			{ status: 'PASSED', _count: { status: 2 } },
			{ status: 'FAILED', _count: { status: 1 } }
		] as any);
	});

	it('registers notification work with waitUntil', async () => {
		const response = await POST({
			params: { runId: 'run1' }
		} as any);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.stats.failed).toBe(1);
		expect(waitUntil).toHaveBeenCalledTimes(1);
		expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise));

		await vi.mocked(waitUntil).mock.calls[0][0];
		expect(notifyTestRunFailed).toHaveBeenCalled();
		expect(notifyTestRunCompleted).toHaveBeenCalled();
	});
});
