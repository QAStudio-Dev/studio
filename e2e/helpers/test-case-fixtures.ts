import { expect, type APIRequestContext } from '@playwright/test';
import { getApiClient } from './cleanup';

export type TestCaseWithHistory = {
	testCaseId: string;
	testRunId: string;
	title: string;
};

type ExecutionStep = {
	title: string;
	category?: 'hook' | 'test.step' | 'pw:api' | 'expect' | 'fixture' | 'other';
	status?: 'passed' | 'failed' | 'skipped' | 'timedout';
	duration?: number;
	error?: string;
	steps?: ExecutionStep[];
};

/**
 * Create a test case with execution history (nested step results).
 * This exercises the case detail page load path that previously threw a 500
 * when TestStepResult fields were queried with stale Prisma select names.
 */
export async function createTestCaseWithExecutionHistory(
	request: APIRequestContext,
	projectId: string,
	title: string
): Promise<TestCaseWithHistory> {
	const api = getApiClient(request);

	const caseResponse = await api.createTestCase({
		projectId,
		title,
		description: 'E2E regression fixture for case detail page'
	});
	expect(caseResponse.ok()).toBe(true);
	const caseBody = await api.getResponseBody(caseResponse);
	const testCaseId = caseBody.testCase.id as string;

	const runResponse = await api.createTestRun({
		projectId,
		name: `E2E Run ${Date.now()}`
	});
	expect(runResponse.ok()).toBe(true);
	const runBody = await api.getResponseBody(runResponse);
	const testRunId = runBody.id as string;

	const steps: ExecutionStep[] = [
		{
			title: 'Open test case page',
			category: 'test.step',
			status: 'passed',
			duration: 500
		},
		{
			title: 'Verify test case content',
			category: 'test.step',
			status: 'failed',
			duration: 1000,
			error: 'Expected element to be visible',
			steps: [
				{
					title: 'expect.toBeVisible',
					category: 'expect',
					status: 'failed',
					error: 'Timeout 5000ms exceeded'
				}
			]
		}
	];

	const resultsResponse = await api.submitTestResults({
		testRunId,
		results: [
			{
				title,
				status: 'failed',
				duration: 1500,
				steps
			}
		]
	});
	expect(resultsResponse.ok()).toBe(true);

	return { testCaseId, testRunId, title };
}
