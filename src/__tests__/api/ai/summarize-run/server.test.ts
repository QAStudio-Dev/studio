import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		testRun: {
			findUnique: vi.fn(),
			update: vi.fn()
		}
	}
}));

vi.mock('$lib/server/auth', () => ({
	requirePremiumFeature: vi.fn()
}));

vi.mock('$lib/server/openai', () => ({
	summarizeTestRun: vi.fn(),
	analyzeFailurePatterns: vi.fn()
}));

import { POST } from '../../../../routes/api/ai/summarize-run/+server';
import { db } from '$lib/server/db';
import { requirePremiumFeature } from '$lib/server/auth';
import { analyzeFailurePatterns, summarizeTestRun } from '$lib/server/openai';

function result(status: 'PASSED' | 'FAILED', index: number) {
	return {
		status,
		errorMessage: status === 'FAILED' ? `Timeout ${index}` : null,
		executedAt: new Date('2026-10-05T19:00:00.000Z'),
		testCase: {
			title: `Case ${index}`,
			type: 'E2E',
			priority: 'HIGH',
			suite: { id: 'suite1', name: 'Checkout' }
		}
	};
}

function event(body: unknown) {
	return {
		request: new Request('http://localhost/api/ai/summarize-run', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as any;
}

describe('POST /api/ai/summarize-run', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(requirePremiumFeature).mockResolvedValue({
			userId: 'user1',
			user: { teamId: 'team1' }
		} as any);
		vi.mocked(db.testRun.update).mockResolvedValue({} as any);
		vi.mocked(summarizeTestRun).mockResolvedValue(
			'Run is unhealthy because checkout times out.'
		);
		vi.mocked(analyzeFailurePatterns).mockResolvedValue(
			'All four failures time out in checkout.'
		);
	});

	it('returns the summary when pattern analysis fails', async () => {
		vi.mocked(analyzeFailurePatterns).mockRejectedValue(
			new Error('Failed to analyze failure patterns')
		);
		vi.mocked(db.testRun.findUnique).mockResolvedValue({
			id: 'IFq6',
			name: 'Nightly',
			aiSummary: null,
			project: { createdBy: 'user1', teamId: 'team1' },
			results: [
				result('FAILED', 1),
				result('FAILED', 2),
				result('FAILED', 3),
				result('FAILED', 4)
			]
		} as any);

		const response = await POST(event({ testRunId: 'IFq6', regenerate: false }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.summary).toBe('Run is unhealthy because checkout times out.');
		expect(body.patternAnalysis).toBeNull();
		expect(body.cached).toBe(false);
		expect(db.testRun.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'IFq6' },
				data: expect.objectContaining({
					aiSummary: 'Run is unhealthy because checkout times out.',
					aiPatternAnalysis: null
				})
			})
		);
	});

	it('includes pattern analysis when it succeeds', async () => {
		vi.mocked(db.testRun.findUnique).mockResolvedValue({
			id: 'IFq6',
			name: 'Nightly',
			aiSummary: null,
			project: { createdBy: 'user1', teamId: 'team1' },
			results: [
				result('PASSED', 1),
				result('FAILED', 2),
				result('FAILED', 3),
				result('FAILED', 4)
			]
		} as any);

		const response = await POST(event({ testRunId: 'IFq6', regenerate: false }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.patternAnalysis).toBe('All four failures time out in checkout.');
		expect(analyzeFailurePatterns).toHaveBeenCalledWith({
			failures: [
				{
					testCaseTitle: 'Case 2',
					errorMessage: 'Timeout 2',
					testType: 'E2E',
					suiteName: 'Checkout'
				},
				{
					testCaseTitle: 'Case 3',
					errorMessage: 'Timeout 3',
					testType: 'E2E',
					suiteName: 'Checkout'
				},
				{
					testCaseTitle: 'Case 4',
					errorMessage: 'Timeout 4',
					testType: 'E2E',
					suiteName: 'Checkout'
				}
			]
		});
	});

	it('still fails the request when the summary itself fails', async () => {
		vi.mocked(summarizeTestRun).mockRejectedValue(new Error('Failed to generate AI summary'));
		vi.mocked(db.testRun.findUnique).mockResolvedValue({
			id: 'IFq6',
			name: 'Nightly',
			aiSummary: null,
			project: { createdBy: 'user1', teamId: 'team1' },
			results: [result('FAILED', 1), result('FAILED', 2), result('FAILED', 3)]
		} as any);

		await expect(POST(event({ testRunId: 'IFq6', regenerate: false }))).rejects.toMatchObject({
			status: 500
		});
		expect(db.testRun.update).not.toHaveBeenCalled();
	});
});
