import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../../routes/api/reports/analytics/+server';
import { db } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the auth module
vi.mock('$lib/server/auth', () => ({
	requireAuth: vi.fn()
}));

// Mock the db module
vi.mock('$lib/server/db', () => ({
	db: {
		user: {
			findUnique: vi.fn()
		},
		project: {
			findUnique: vi.fn()
		},
		testRun: {
			findMany: vi.fn()
		},
		testResult: {
			findMany: vi.fn()
		}
	}
}));

import { requireAuth } from '$lib/server/auth';

describe('GET /api/reports/analytics', () => {
	const mockUserId = 'user-123';
	const mockProjectId = 'project-123';
	const mockTeamId = 'team-123';

	const createMockEvent = (searchParams: Record<string, string>) =>
		({
			url: new URL(
				`http://localhost/api/reports/analytics?${new URLSearchParams(searchParams).toString()}`
			),
			locals: { userId: mockUserId }
		}) as any as RequestEvent<Record<string, string>, '/api/reports/analytics'>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(requireAuth).mockResolvedValue(mockUserId);
	});

	it('requires authentication', async () => {
		vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

		const event = createMockEvent({ projectId: mockProjectId });

		await expect(GET(event)).rejects.toThrow('Unauthorized');
	});

	it('requires projectId parameter', async () => {
		const event = createMockEvent({});

		const response = await GET(event);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe('projectId is required');
	});

	it('returns 404 for non-existent project', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue(null);

		const event = createMockEvent({ projectId: mockProjectId });

		const response = await GET(event);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toBe('Project not found');
	});

	it('returns 403 for unauthorized project access', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: null
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: 'different-user',
			teamId: null
		} as any);

		const event = createMockEvent({ projectId: mockProjectId });

		const response = await GET(event);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe('Access denied');
	});

	it('validates days parameter within bounds', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.testRun.findMany).mockResolvedValue([]);
		vi.mocked(db.testResult.findMany).mockResolvedValue([]);

		// Test with days > MAX (365)
		const event1 = createMockEvent({ projectId: mockProjectId, days: '500' });
		const response1 = await GET(event1);
		const data1 = await response1.json();
		expect(data1.dateRange.days).toBe(365);

		// Test with days < MIN (1)
		const event2 = createMockEvent({ projectId: mockProjectId, days: '0' });
		const response2 = await GET(event2);
		const data2 = await response2.json();
		expect(data2.dateRange.days).toBe(1);

		// Test with valid days
		const event3 = createMockEvent({ projectId: mockProjectId, days: '30' });
		const response3 = await GET(event3);
		const data3 = await response3.json();
		expect(data3.dateRange.days).toBe(30);
	});

	it('calculates pass rate correctly', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		const mockTestRuns = [
			{
				id: 'run-1',
				createdAt: new Date(),
				status: 'COMPLETED',
				results: []
			}
		];

		const mockTestResults = [
			{
				id: 'result-1',
				testCaseId: 'case-1',
				status: 'PASSED',
				duration: 1000,
				retry: 0,
				testCase: { id: 'case-1', title: 'Test 1' }
			},
			{
				id: 'result-2',
				testCaseId: 'case-2',
				status: 'PASSED',
				duration: 2000,
				retry: 0,
				testCase: { id: 'case-2', title: 'Test 2' }
			},
			{
				id: 'result-3',
				testCaseId: 'case-3',
				status: 'FAILED',
				duration: 500,
				retry: 0,
				testCase: { id: 'case-3', title: 'Test 3' }
			}
		];

		vi.mocked(db.testRun.findMany).mockResolvedValue(mockTestRuns as any);
		vi.mocked(db.testResult.findMany).mockResolvedValue(mockTestResults as any);

		const event = createMockEvent({ projectId: mockProjectId });
		const response = await GET(event);
		const data = await response.json();

		expect(data.stats.totalTests).toBe(3);
		expect(data.stats.passedTests).toBe(2);
		expect(data.stats.failedTests).toBe(1);
		expect(data.stats.passRate).toBeCloseTo(66.67, 1);
	});

	it('identifies flaky tests (10-90% failure rate)', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		const mockTestRuns = [
			{
				id: 'run-1',
				createdAt: new Date(),
				status: 'COMPLETED',
				results: []
			}
		];

		// Create a flaky test: 5 passes, 5 failures (50% failure rate)
		const mockTestResults = [
			...Array(5)
				.fill(null)
				.map((_, i) => ({
					id: `result-pass-${i}`,
					testCaseId: 'flaky-test',
					status: 'PASSED',
					duration: 1000,
					retry: 0,
					testCase: { id: 'flaky-test', title: 'Flaky Test' }
				})),
			...Array(5)
				.fill(null)
				.map((_, i) => ({
					id: `result-fail-${i}`,
					testCaseId: 'flaky-test',
					status: 'FAILED',
					duration: 1000,
					retry: 0,
					testCase: { id: 'flaky-test', title: 'Flaky Test' }
				}))
		];

		vi.mocked(db.testRun.findMany).mockResolvedValue(mockTestRuns as any);
		vi.mocked(db.testResult.findMany).mockResolvedValue(mockTestResults as any);

		const event = createMockEvent({ projectId: mockProjectId });
		const response = await GET(event);
		const data = await response.json();

		expect(data.flakyTests).toHaveLength(1);
		expect(data.flakyTests[0].title).toBe('Flaky Test');
		expect(data.flakyTests[0].failureRate).toBe(50);
	});

	it('calculates problem scores correctly', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		const mockTestRuns = [
			{
				id: 'run-1',
				createdAt: new Date(),
				status: 'COMPLETED',
				results: []
			}
		];

		const mockTestResults = [
			{
				id: 'result-1',
				testCaseId: 'case-1',
				status: 'FAILED',
				duration: 1000,
				retry: 0,
				testCase: { id: 'case-1', title: 'Test with Failures' }
			},
			{
				id: 'result-2',
				testCaseId: 'case-1',
				status: 'FAILED',
				duration: 1000,
				retry: 1,
				testCase: { id: 'case-1', title: 'Test with Failures' }
			},
			{
				id: 'result-3',
				testCaseId: 'case-1',
				status: 'PASSED',
				duration: 1000,
				retry: 0,
				testCase: { id: 'case-1', title: 'Test with Failures' }
			},
			{
				id: 'result-4',
				testCaseId: 'case-1',
				status: 'PASSED',
				duration: 1000,
				retry: 1,
				testCase: { id: 'case-1', title: 'Test with Failures' }
			}
		];

		vi.mocked(db.testRun.findMany).mockResolvedValue(mockTestRuns as any);
		vi.mocked(db.testResult.findMany).mockResolvedValue(mockTestResults as any);

		const event = createMockEvent({ projectId: mockProjectId });
		const response = await GET(event);
		const data = await response.json();

		expect(data.problematicTests).toHaveLength(1);
		// Problem score = failures * 2 + retries = 2 * 2 + 2 = 6
		expect(data.problematicTests[0].problemScore).toBe(6);
		expect(data.problematicTests[0].failures).toBe(2);
		expect(data.problematicTests[0].retries).toBe(2);
	});

	it('sorts slowest tests by avg duration', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		const mockTestRuns = [
			{
				id: 'run-1',
				createdAt: new Date(),
				status: 'COMPLETED',
				results: []
			}
		];

		const mockTestResults = [
			{
				id: 'result-1',
				testCaseId: 'fast-test',
				status: 'PASSED',
				duration: 100,
				retry: 0,
				testCase: { id: 'fast-test', title: 'Fast Test' }
			},
			{
				id: 'result-2',
				testCaseId: 'slow-test',
				status: 'PASSED',
				duration: 5000,
				retry: 0,
				testCase: { id: 'slow-test', title: 'Slow Test' }
			},
			{
				id: 'result-3',
				testCaseId: 'medium-test',
				status: 'PASSED',
				duration: 1000,
				retry: 0,
				testCase: { id: 'medium-test', title: 'Medium Test' }
			}
		];

		vi.mocked(db.testRun.findMany).mockResolvedValue(mockTestRuns as any);
		vi.mocked(db.testResult.findMany).mockResolvedValue(mockTestResults as any);

		const event = createMockEvent({ projectId: mockProjectId });
		const response = await GET(event);
		const data = await response.json();

		expect(data.slowestTests).toHaveLength(3);
		expect(data.slowestTests[0].title).toBe('Slow Test');
		expect(data.slowestTests[0].avgDuration).toBe(5000);
		expect(data.slowestTests[1].title).toBe('Medium Test');
		expect(data.slowestTests[2].title).toBe('Fast Test');
	});

	it('groups test runs by day correctly', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		const day1 = new Date('2025-01-01T10:00:00Z');
		const day2 = new Date('2025-01-02T10:00:00Z');

		const mockTestRuns = [
			{
				id: 'run-1',
				createdAt: day1,
				status: 'COMPLETED',
				results: [{ status: 'PASSED' }]
			},
			{
				id: 'run-2',
				createdAt: day1,
				status: 'COMPLETED',
				results: [{ status: 'FAILED' }]
			},
			{
				id: 'run-3',
				createdAt: day2,
				status: 'COMPLETED',
				results: [{ status: 'PASSED' }]
			}
		];

		vi.mocked(db.testRun.findMany).mockResolvedValue(mockTestRuns as any);
		vi.mocked(db.testResult.findMany).mockResolvedValue([]);

		const event = createMockEvent({ projectId: mockProjectId });
		const response = await GET(event);
		const data = await response.json();

		expect(data.runsOverTime).toHaveLength(2);
		expect(data.runsOverTime[0].date).toBe('2025-01-01');
		expect(data.runsOverTime[0].total).toBe(2);
		expect(data.runsOverTime[0].passed).toBe(1);
		expect(data.runsOverTime[0].failed).toBe(1);
		expect(data.runsOverTime[1].date).toBe('2025-01-02');
		expect(data.runsOverTime[1].total).toBe(1);
		expect(data.runsOverTime[1].passed).toBe(1);
		expect(data.runsOverTime[1].failed).toBe(0);
	});

	it('handles projects with no test data', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.testRun.findMany).mockResolvedValue([]);
		vi.mocked(db.testResult.findMany).mockResolvedValue([]);

		const event = createMockEvent({ projectId: mockProjectId });
		const response = await GET(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.stats.totalTestRuns).toBe(0);
		expect(data.stats.totalTests).toBe(0);
		expect(data.stats.passRate).toBe(0);
		expect(data.runsOverTime).toHaveLength(0);
		expect(data.problematicTests).toHaveLength(0);
		expect(data.slowestTests).toHaveLength(0);
		expect(data.flakyTests).toHaveLength(0);
	});

	it('respects MAX_TEST_RUNS limit', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.testRun.findMany).mockResolvedValue([]);
		vi.mocked(db.testResult.findMany).mockResolvedValue([]);

		const event = createMockEvent({ projectId: mockProjectId });
		await GET(event);

		// Verify that testRun.findMany was called with take: 1000
		expect(db.testRun.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				take: 1000
			})
		);
	});

	it('handles team-based access control', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: 'different-user',
			teamId: mockTeamId // Same team
		} as any);

		vi.mocked(db.testRun.findMany).mockResolvedValue([]);
		vi.mocked(db.testResult.findMany).mockResolvedValue([]);

		const event = createMockEvent({ projectId: mockProjectId });
		const response = await GET(event);

		expect(response.status).toBe(200);
	});

	it('uses testRunIds to avoid N+1 query', async () => {
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: mockUserId,
			teamId: mockTeamId
		} as any);

		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: mockProjectId,
			createdBy: mockUserId,
			teamId: mockTeamId
		} as any);

		const mockTestRuns = [
			{
				id: 'run-1',
				createdAt: new Date(),
				status: 'COMPLETED',
				results: []
			},
			{
				id: 'run-2',
				createdAt: new Date(),
				status: 'COMPLETED',
				results: []
			}
		];

		vi.mocked(db.testRun.findMany).mockResolvedValue(mockTestRuns as any);
		vi.mocked(db.testResult.findMany).mockResolvedValue([]);

		const event = createMockEvent({ projectId: mockProjectId });
		await GET(event);

		// Verify that testResult.findMany was called with testRunId IN clause
		expect(db.testResult.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					testRunId: {
						in: ['run-1', 'run-2']
					}
				})
			})
		);
	});
});
