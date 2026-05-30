import type { APIRequestContext } from '@playwright/test';
import { ApiClient } from '../pages/api';

/** Prefix used by test-cases E2E tests for created resources */
export const E2E_RESOURCE_PREFIX = 'E2E ';

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

function isE2eResourceName(name: string): boolean {
	return name.startsWith(E2E_RESOURCE_PREFIX) || name.startsWith('E2E');
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
	projectId: string
): Promise<{ casesDeleted: number; suitesDeleted: number }> {
	const api = getApiClient(request);
	let casesDeleted = 0;
	let suitesDeleted = 0;

	let page = 1;
	let hasMore = true;

	while (hasMore) {
		const response = await api.listTestCases(projectId, {
			search: 'E2E',
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
			if (!isE2eResourceName(testCase.title)) {
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
			.filter((suite) => isE2eResourceName(suite.name))
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
