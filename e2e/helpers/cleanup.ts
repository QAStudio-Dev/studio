import type { APIRequestContext } from '@playwright/test';
import { ApiClient } from '../pages/api';

/** Prefix for test-cases.test.ts resources (must not overlap with other E2E files). */
export const E2E_CASES_PREFIX = 'E2E Cases';

/** Prefix for test-case-detail.test.ts resources (must not overlap with other E2E files). */
export const E2E_DETAIL_PREFIX = 'E2E Detail';

/** @deprecated Use E2E_CASES_PREFIX or E2E_DETAIL_PREFIX for scoped cleanup. */
export const E2E_RESOURCE_PREFIX = 'E2E ';

export type CleanupE2eOptions = {
	/** Only delete cases/suites whose title/name starts with this prefix. */
	prefix: string;
};

export function getApiClient(request: APIRequestContext): ApiClient {
	const apiKey = process.env.QA_STUDIO_API_KEY;
	if (!apiKey) {
		throw new Error('QA_STUDIO_API_KEY is required for E2E cleanup');
	}
	return new ApiClient(request, '', apiKey);
}

export function getE2eProjectId(): string {
	const projectId = process.env.QA_STUDIO_PROJECT_ID;
	if (!projectId) {
		throw new Error('QA_STUDIO_PROJECT_ID is required for test-cases E2E tests');
	}
	return projectId;
}

function matchesCleanupPrefix(name: string, prefix: string): boolean {
	return name.startsWith(prefix);
}

type SuiteNode = {
	id: string;
	name: string;
	children?: SuiteNode[];
};

function flattenSuites(
	suites: SuiteNode[],
	depth = 0
): Array<{ id: string; name: string; depth: number }> {
	const flat: Array<{ id: string; name: string; depth: number }> = [];
	for (const suite of suites) {
		flat.push({ id: suite.id, name: suite.name, depth });
		if (suite.children?.length) {
			flat.push(...flattenSuites(suite.children, depth + 1));
		}
	}
	return flat;
}

/**
 * Remove E2E test cases and suites left over from previous runs.
 * Uses the API so cleanup works even when UI tests fail mid-flight.
 */
export async function cleanupE2eTestData(
	request: APIRequestContext,
	projectId: string,
	options: CleanupE2eOptions
): Promise<{ casesDeleted: number; suitesDeleted: number }> {
	const { prefix } = options;
	const api = getApiClient(request);
	let casesDeleted = 0;
	let suitesDeleted = 0;

	let page = 1;
	let hasMore = true;

	while (hasMore) {
		const response = await api.listTestCases(projectId, {
			search: prefix,
			page,
			limit: 100
		});

		if (!response.ok()) {
			break;
		}

		const body = await api.getResponseBody(response);
		const cases: Array<{ id: string; title: string }> = body.data ?? [];

		if (cases.length === 0) {
			break;
		}

		for (const testCase of cases) {
			if (!matchesCleanupPrefix(testCase.title, prefix)) {
				continue;
			}
			const deleted = await api.deleteTestCase(projectId, testCase.id);
			if (deleted.ok()) {
				casesDeleted++;
			}
		}

		hasMore = Boolean(body.pagination?.hasMore);
		page += 1;
	}

	const suitesResponse = await api.listSuites(projectId);
	if (suitesResponse.ok()) {
		const suites = (await api.getResponseBody(suitesResponse)) as SuiteNode[];
		const e2eSuites = flattenSuites(suites)
			.filter((suite) => matchesCleanupPrefix(suite.name, prefix))
			.sort((a, b) => b.depth - a.depth);

		for (const suite of e2eSuites) {
			const deleted = await api.deleteSuite(projectId, suite.id);
			if (deleted.ok()) {
				suitesDeleted++;
			}
		}
	}

	if (casesDeleted > 0 || suitesDeleted > 0) {
		console.log(
			`✓ E2E cleanup for project ${projectId}: ${casesDeleted} case(s), ${suitesDeleted} suite(s)`
		);
	}

	return { casesDeleted, suitesDeleted };
}

/**
 * Poll the API until a test case is readable (avoids navigating before persistence
 * or while another worker's cleanup is in flight).
 */
export async function waitForTestCaseInApi(
	request: APIRequestContext,
	projectId: string,
	testCaseId: string,
	timeoutMs = 30_000
): Promise<void> {
	const api = getApiClient(request);
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		try {
			const response = await api.getTestCase(projectId, testCaseId);
			if (response.ok()) {
				return;
			}
		} catch {
			// Transient network/request errors — keep polling until deadline.
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}

	throw new Error(`Timed out waiting for test case ${testCaseId} to be available via API`);
}
