import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

// Constants for analytics configuration
const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 365;
const TOP_ITEMS_LIMIT = 10;
const MAX_TEST_RUNS = 1000; // Limit to prevent excessive data fetching
const FLAKY_TEST_MIN_FAILURE_RATE = 10;
const FLAKY_TEST_MAX_FAILURE_RATE = 90;
const PROBLEM_SCORE_FAILURE_WEIGHT = 2;

/**
 * Get analytics data for reports dashboard
 * GET /api/reports/analytics?projectId=xxx&days=7
 *
 * Returns:
 * - Test runs over time (bar chart data)
 * - Most problematic tests (high failure rate + retries)
 * - Longest running tests
 * - Flaky tests (inconsistent pass/fail)
 * - Test execution trends
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const projectId = event.url.searchParams.get('projectId');

	// Validate and constrain days parameter
	const daysParam = event.url.searchParams.get('days');
	const parsedDays = daysParam ? parseInt(daysParam, 10) : DEFAULT_DAYS;
	const days = Math.min(Math.max(parsedDays, MIN_DAYS), MAX_DAYS);

	if (!projectId) {
		return json({ error: 'projectId is required' }, { status: 400 });
	}

	// Get user to check access
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	// Verify project access
	const project = await db.project.findUnique({
		where: { id: projectId },
		select: {
			id: true,
			createdBy: true,
			teamId: true
		}
	});

	if (!project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	const hasAccess =
		project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

	if (!hasAccess) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);

	// 1. Test Runs Over Time (for bar chart)
	const testRuns = await db.testRun.findMany({
		where: {
			projectId,
			createdAt: {
				gte: startDate
			}
		},
		select: {
			id: true,
			name: true,
			status: true,
			createdAt: true,
			completedAt: true,
			results: {
				select: {
					status: true
				}
			}
		},
		orderBy: {
			createdAt: 'asc'
		},
		take: MAX_TEST_RUNS
	});

	// Group test runs by day
	const runsByDay = new Map<
		string,
		{ date: string; total: number; passed: number; failed: number }
	>();

	testRuns.forEach((run) => {
		const dateKey = run.createdAt.toISOString().split('T')[0];

		if (!runsByDay.has(dateKey)) {
			runsByDay.set(dateKey, {
				date: dateKey,
				total: 0,
				passed: 0,
				failed: 0
			});
		}

		const day = runsByDay.get(dateKey)!;
		day.total++;

		const passedCount = run.results.filter((r) => r.status === 'PASSED').length;
		const failedCount = run.results.filter((r) => r.status === 'FAILED').length;

		if (passedCount > 0 && failedCount === 0) {
			day.passed++;
		} else if (failedCount > 0) {
			day.failed++;
		}
	});

	const runsOverTime = Array.from(runsByDay.values());

	// 2. Most Problematic Tests (high failure rate + retries)
	// Use testRunIds from already-fetched testRuns to avoid N+1 query
	const testRunIds = testRuns.map((run) => run.id);
	const testResults = await db.testResult.findMany({
		where: {
			testRunId: {
				in: testRunIds
			},
			executedAt: {
				gte: startDate
			}
		},
		select: {
			id: true,
			testCaseId: true,
			status: true,
			duration: true,
			retry: true,
			testCase: {
				select: {
					id: true,
					title: true
				}
			}
		}
	});

	// Calculate problematic tests
	const testCaseStats = new Map<
		string,
		{
			id: string;
			title: string;
			totalRuns: number;
			failures: number;
			retries: number;
			failureRate: number;
			avgDuration: number;
			problemScore: number;
		}
	>();

	testResults.forEach((result) => {
		const key = result.testCaseId;

		if (!testCaseStats.has(key)) {
			testCaseStats.set(key, {
				id: result.testCase.id,
				title: result.testCase.title,
				totalRuns: 0,
				failures: 0,
				retries: 0,
				failureRate: 0,
				avgDuration: 0,
				problemScore: 0
			});
		}

		const stats = testCaseStats.get(key)!;
		stats.totalRuns++;

		if (result.status === 'FAILED') {
			stats.failures++;
		}

		if (result.retry > 0) {
			stats.retries++;
		}
	});

	// Calculate failure rates and problem scores
	testCaseStats.forEach((stats) => {
		// Defensive check for division by zero (should never happen, but be safe)
		stats.failureRate = stats.totalRuns > 0 ? (stats.failures / stats.totalRuns) * 100 : 0;
		// Problem score: weight failures more heavily than retries
		// Rationale: Actual failures indicate real issues, retries indicate instability
		stats.problemScore = stats.failures * PROBLEM_SCORE_FAILURE_WEIGHT + stats.retries;
	});

	const problematicTests = Array.from(testCaseStats.values())
		.filter((t) => t.problemScore > 0)
		.sort((a, b) => b.problemScore - a.problemScore)
		.slice(0, TOP_ITEMS_LIMIT);

	// 3. Calculate average durations per test case
	const durationsByTest = new Map<
		string,
		{
			id: string;
			title: string;
			avgDuration: number;
			maxDuration: number;
			count: number;
		}
	>();

	testResults.forEach((result) => {
		if (!result.duration) return;

		const key = result.testCaseId;

		if (!durationsByTest.has(key)) {
			durationsByTest.set(key, {
				id: result.testCase.id,
				title: result.testCase.title,
				avgDuration: 0,
				maxDuration: 0,
				count: 0
			});
		}

		const stats = durationsByTest.get(key)!;
		stats.maxDuration = Math.max(stats.maxDuration, result.duration);
		stats.avgDuration = (stats.avgDuration * stats.count + result.duration) / (stats.count + 1);
		stats.count++;
	});

	const slowestTests = Array.from(durationsByTest.values())
		.sort((a, b) => b.avgDuration - a.avgDuration)
		.slice(0, TOP_ITEMS_LIMIT);

	// 4. Flaky Tests (inconsistent results)
	// Rationale: Tests with 10-90% failure rate are considered flaky
	// Tests closer to 50% are most problematic (most unpredictable)
	const flakyTests = Array.from(testCaseStats.values())
		.filter((t) => {
			// A test is flaky if it has both passes and failures within threshold
			const passes = t.totalRuns - t.failures;
			return (
				passes > 0 &&
				t.failures > 0 &&
				t.failureRate < FLAKY_TEST_MAX_FAILURE_RATE &&
				t.failureRate > FLAKY_TEST_MIN_FAILURE_RATE
			);
		})
		.sort((a, b) => {
			// Sort by "flakiness score" - tests closest to 50% failure rate are most flaky
			const aScore = Math.abs(50 - a.failureRate);
			const bScore = Math.abs(50 - b.failureRate);
			return aScore - bScore;
		})
		.slice(0, TOP_ITEMS_LIMIT);

	// 5. Overall Stats
	const totalTestRuns = testRuns.length;
	const completedTestRuns = testRuns.filter((r) => r.status === 'COMPLETED').length;
	const totalTests = testResults.length;
	const passedTests = testResults.filter((r) => r.status === 'PASSED').length;
	const failedTests = testResults.filter((r) => r.status === 'FAILED').length;
	const blockedTests = testResults.filter((r) => r.status === 'BLOCKED').length;
	// Pass rate excludes skipped tests (industry standard)
	const executedTests = passedTests + failedTests + blockedTests;
	const passRate = executedTests > 0 ? (passedTests / executedTests) * 100 : 0;

	const totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
	const avgTestDuration = totalTests > 0 ? totalDuration / totalTests : 0;

	return json({
		stats: {
			totalTestRuns,
			completedTestRuns,
			totalTests,
			passedTests,
			failedTests,
			passRate,
			avgTestDuration
		},
		runsOverTime,
		problematicTests,
		slowestTests,
		flakyTests,
		dateRange: {
			start: startDate.toISOString(),
			end: new Date().toISOString(),
			days
		}
	});
};
