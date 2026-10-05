import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '$prisma/client';
import {
	AutomationStatus,
	Priority,
	RunStatus,
	TestStatus,
	TestType,
	UserRole
} from '$prisma/client';

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

const now = new Date('2026-10-05T19:00:00.000Z');

type SummarizeRunRecord = Prisma.TestRunGetPayload<{
	include: {
		project: { include: { team: true } };
		results: {
			include: {
				testCase: {
					include: {
						suite: { select: { id: true; name: true } };
					};
				};
			};
		};
	};
}>;
type AuthResult = Awaited<ReturnType<typeof requirePremiumFeature>>;

const authResult = {
	userId: 'user1',
	user: {
		id: 'user1',
		email: 'qa@example.com',
		passwordHash: null,
		firstName: 'QA',
		lastName: 'Tester',
		imageUrl: null,
		role: UserRole.TESTER,
		emailVerified: true,
		ssoProvider: null,
		ssoProviderId: null,
		teamId: 'team1',
		createdAt: now,
		updatedAt: now,
		team: null
	}
} satisfies AuthResult;

function result(status: 'PASSED' | 'FAILED', index: number): SummarizeRunRecord['results'][number] {
	return {
		id: `result-${index}`,
		testCaseId: `case-${index}`,
		testRunId: 'IFq6',
		status: status === 'PASSED' ? TestStatus.PASSED : TestStatus.FAILED,
		comment: null,
		duration: null,
		stackTrace: null,
		errorMessage: status === 'FAILED' ? `Timeout ${index}` : null,
		executedBy: 'user1',
		executedAt: now,
		createdAt: now,
		updatedAt: now,
		aiDiagnosis: null,
		aiDiagnosisGeneratedAt: null,
		fullTitle: null,
		errorSnippet: null,
		errorLocation: null,
		startTime: null,
		endTime: null,
		retry: 0,
		projectName: null,
		metadata: null,
		consoleOutput: null,
		testCase: {
			id: `case-${index}`,
			title: `Case ${index}`,
			description: null,
			preconditions: null,
			steps: null,
			expectedResult: null,
			priority: Priority.HIGH,
			type: TestType.E2E,
			automationStatus: AutomationStatus.NOT_AUTOMATED,
			tags: [],
			projectId: 'project1',
			suiteId: 'suite1',
			createdBy: 'user1',
			order: index,
			createdAt: now,
			updatedAt: now,
			suite: { id: 'suite1', name: 'Checkout' }
		}
	} satisfies SummarizeRunRecord['results'][number];
}

function testRun(statuses: Array<'PASSED' | 'FAILED'>): SummarizeRunRecord {
	return {
		id: 'IFq6',
		name: 'Nightly',
		description: null,
		projectId: 'project1',
		milestoneId: null,
		environmentId: null,
		status: RunStatus.COMPLETED,
		createdBy: 'user1',
		startedAt: now,
		completedAt: now,
		createdAt: now,
		updatedAt: now,
		aiSummary: null,
		aiPatternAnalysis: null,
		aiSummaryGeneratedAt: null,
		project: {
			id: 'project1',
			name: 'Checkout',
			description: null,
			key: 'CHK',
			createdBy: 'user1',
			teamId: 'team1',
			createdAt: now,
			updatedAt: now,
			team: null
		},
		results: statuses.map((status, index) => result(status, index + 1))
	} satisfies SummarizeRunRecord;
}

type SummarizeRunEvent = Parameters<typeof POST>[0];

function event(body: unknown): SummarizeRunEvent {
	return {
		request: new Request('http://localhost/api/ai/summarize-run', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as SummarizeRunEvent;
}

describe('POST /api/ai/summarize-run', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(requirePremiumFeature).mockResolvedValue(authResult);
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
		vi.mocked(db.testRun.findUnique).mockResolvedValue(
			testRun(['FAILED', 'FAILED', 'FAILED', 'FAILED'])
		);

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
		vi.mocked(db.testRun.findUnique).mockResolvedValue(
			testRun(['PASSED', 'FAILED', 'FAILED', 'FAILED'])
		);

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
		vi.mocked(db.testRun.findUnique).mockResolvedValue(testRun(['FAILED', 'FAILED', 'FAILED']));

		await expect(POST(event({ testRunId: 'IFq6', regenerate: false }))).rejects.toMatchObject({
			status: 500
		});
		expect(db.testRun.update).not.toHaveBeenCalled();
	});
});
