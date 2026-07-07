import { describe, it, expect } from 'vitest';
import { testResultStepsSelect } from '$lib/server/test-result-steps-select';

const VALID_TEST_STEP_RESULT_FIELDS = new Set([
	'id',
	'stepNumber',
	'title',
	'category',
	'status',
	'duration',
	'error',
	'stackTrace',
	'startTime',
	'location',
	'comment',
	'parentStepId',
	'testResultId',
	'createdAt',
	'childSteps'
]);

const REMOVED_FIELDS = ['description', 'errorMessage'];

function collectSelectKeys(select: Record<string, unknown>): string[] {
	return Object.keys(select).filter((key) => key !== 'childSteps');
}

describe('testResultStepsSelect', () => {
	it('uses current TestStepResult field names', () => {
		const parentKeys = collectSelectKeys(testResultStepsSelect.select);
		const childKeys = collectSelectKeys(testResultStepsSelect.select.childSteps.select);

		for (const key of [...parentKeys, ...childKeys]) {
			expect(VALID_TEST_STEP_RESULT_FIELDS.has(key)).toBe(true);
		}

		expect(parentKeys).toContain('title');
		expect(parentKeys).toContain('error');
		expect(parentKeys).toContain('category');
	});

	it('does not use removed schema field names', () => {
		const parentKeys = collectSelectKeys(testResultStepsSelect.select);
		const childKeys = collectSelectKeys(testResultStepsSelect.select.childSteps.select);

		for (const key of [...parentKeys, ...childKeys]) {
			expect(REMOVED_FIELDS).not.toContain(key);
		}
	});

	it('limits nested step depth to one child level', () => {
		expect(testResultStepsSelect.select.childSteps.select).not.toHaveProperty('childSteps');
	});
});
