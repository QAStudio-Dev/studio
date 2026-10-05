import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RunsPage from './+page.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/stores', async () => {
	const { readable } = await import('svelte/store');
	return {
		page: readable({
			params: { projectId: 'proj_1' },
			url: new URL('http://localhost/projects/proj_1/runs'),
			route: { id: '/projects/[projectId]/runs' },
			status: 200,
			error: null,
			data: {},
			form: null
		})
	};
});

const requests: string[] = [];

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}

function runPayload(pageNumber: string) {
	return {
		id: `run-${pageNumber}`,
		name: `Run page ${pageNumber}`,
		status: 'COMPLETED',
		environment: null,
		description: null,
		project: { name: 'Demo', key: 'DEMO' },
		milestone: null,
		creator: { firstName: 'Ada', email: 'ada@example.com' },
		stats: { total: 1, passed: 1, failed: 0, blocked: 0, skipped: 0 },
		startedAt: '2026-01-01T00:00:00.000Z',
		completedAt: '2026-01-01T00:01:00.000Z'
	};
}

beforeEach(() => {
	requests.length = 0;
	vi.stubGlobal('alert', vi.fn());
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url =
				typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			requests.push(url);

			if (url.startsWith('/api/projects')) {
				return jsonResponse([{ id: 'proj_1', name: 'Demo' }]);
			}

			const pageNumber = new URL(url, 'http://localhost').searchParams.get('page') ?? '1';
			return jsonResponse({
				testRuns: [runPayload(pageNumber)],
				pagination: { total: 40, totalPages: 2, page: Number(pageNumber), limit: 20 }
			});
		})
	);
});

function listRequests() {
	return requests.filter((url) => url.includes('/api/runs/list'));
}

describe('project test runs pagination', () => {
	it('requests the next page when pagination is used', async () => {
		render(RunsPage);

		await expect.element(page.getByTestId('run-name')).toHaveTextContent('Run page 1');
		await expect.element(page.getByTestId('pagination-current')).toHaveTextContent('1');

		await page.getByTestId('pagination-next').click();

		await expect.element(page.getByTestId('pagination-current')).toHaveTextContent('2');
		await expect.element(page.getByTestId('run-name')).toHaveTextContent('Run page 2');

		const last = new URL(listRequests().at(-1) ?? '', 'http://localhost');
		expect(last.searchParams.get('page')).toBe('2');
		expect(last.searchParams.get('projectId')).toBe('proj_1');
	});

	it('reloads page 1 when a filter changes', async () => {
		render(RunsPage);

		await expect.element(page.getByTestId('pagination-current')).toHaveTextContent('1');
		await page.getByTestId('pagination-next').click();
		await expect.element(page.getByTestId('pagination-current')).toHaveTextContent('2');

		await page.getByTestId('status-filter').selectOptions('COMPLETED');

		await expect.element(page.getByTestId('pagination-current')).toHaveTextContent('1');
		await expect
			.poll(() => {
				const last = new URL(listRequests().at(-1) ?? '', 'http://localhost');
				return `${last.searchParams.get('page')}:${last.searchParams.get('status')}`;
			})
			.toBe('1:COMPLETED');
	});
});
