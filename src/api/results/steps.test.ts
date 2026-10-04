import { describe, it, expect, vi } from 'vitest';
import { flattenTestSteps, mapStatus, parseDateTime, type TestStepInput } from './steps';

vi.mock('$lib/server/db', () => ({
	db: {
		testStepResult: {
			createMany: vi.fn()
		}
	}
}));

vi.mock('$lib/server/ids', () => {
	let counter = 0;
	return {
		generateTestStepId: vi.fn(() => `step${++counter}`)
	};
});

describe('flattenTestSteps', () => {
	it('flattens nested steps with parent ids in one pass', () => {
		const steps: TestStepInput[] = [
			{
				title: 'outer',
				status: 'failed',
				steps: [
					{ title: 'inner-a', status: 'passed' },
					{
						title: 'inner-b',
						status: 'failed',
						steps: [{ title: 'leaf', status: 'failed' }]
					}
				]
			},
			{ title: 'sibling', status: 'passed' }
		];

		const rows = flattenTestSteps(steps, 'result1');
		expect(rows).toHaveLength(5);
		expect(rows.map((row) => row.title)).toEqual([
			'outer',
			'inner-a',
			'inner-b',
			'leaf',
			'sibling'
		]);
		expect(rows[0].parentStepId).toBeNull();
		expect(rows[0].stepNumber).toBe(0);
		expect(rows[1].parentStepId).toBe(rows[0].id);
		expect(rows[1].stepNumber).toBe(0);
		expect(rows[2].parentStepId).toBe(rows[0].id);
		expect(rows[2].stepNumber).toBe(1);
		expect(rows[3].parentStepId).toBe(rows[2].id);
		expect(rows[4].parentStepId).toBeNull();
		expect(rows[4].stepNumber).toBe(1);
		expect(rows.every((row) => row.testResultId === 'result1')).toBe(true);
	});

	it('returns an empty array for missing steps', () => {
		expect(flattenTestSteps([], 'result1')).toEqual([]);
	});
});

describe('mapStatus', () => {
	it('maps playwright statuses', () => {
		expect(mapStatus('passed')).toBe('PASSED');
		expect(mapStatus('failed')).toBe('FAILED');
		expect(mapStatus('timedOut')).toBe('FAILED');
		expect(mapStatus('skipped')).toBe('SKIPPED');
		expect(mapStatus('interrupted')).toBe('SKIPPED');
		expect(mapStatus('unknown')).toBe('SKIPPED');
	});
});

describe('parseDateTime', () => {
	it('parses valid ISO strings and rejects invalid ones', () => {
		expect(parseDateTime(undefined)).toBeNull();
		expect(parseDateTime('not-a-date')).toBeNull();
		expect(parseDateTime('2024-01-01T00:00:00.000Z')?.toISOString()).toBe(
			'2024-01-01T00:00:00.000Z'
		);
	});
});
