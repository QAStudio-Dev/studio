import { describe, it, expect } from 'vitest';
import {
	classifyTestCaseSteps,
	formatTestCaseStepsForText,
	getStructuredTestCaseSteps,
	isStructuredTestCaseStep,
	normalizeStructuredStepsForSave
} from './test-case-steps';

describe('test-case-steps helpers', () => {
	describe('isStructuredTestCaseStep', () => {
		it('accepts objects with an action string', () => {
			expect(isStructuredTestCaseStep({ action: 'Open app' })).toBe(true);
			expect(
				isStructuredTestCaseStep({
					action: 'Tap Login',
					expectedResult: 'Login shown',
					order: 1
				})
			).toBe(true);
		});

		it('rejects non-objects and objects without action', () => {
			expect(isStructuredTestCaseStep('Open app')).toBe(false);
			expect(isStructuredTestCaseStep({ expectedResult: 'x' })).toBe(false);
			expect(isStructuredTestCaseStep(null)).toBe(false);
			expect(isStructuredTestCaseStep([{ action: 'x' }])).toBe(false);
		});
	});

	describe('classifyTestCaseSteps', () => {
		it('classifies empty values', () => {
			expect(classifyTestCaseSteps(null)).toBe('empty');
			expect(classifyTestCaseSteps(undefined)).toBe('empty');
			expect(classifyTestCaseSteps('')).toBe('empty');
			expect(classifyTestCaseSteps('   ')).toBe('empty');
			expect(classifyTestCaseSteps([])).toBe('empty');
		});

		it('classifies plain strings', () => {
			expect(classifyTestCaseSteps('Step 1\nStep 2')).toBe('string');
		});

		it('classifies structured arrays', () => {
			expect(
				classifyTestCaseSteps([
					{ action: 'Open the app', expectedResult: 'Welcome', order: 0 },
					{ action: 'Tap Login', expectedResult: 'Login screen', order: 1 }
				])
			).toBe('structured');
		});

		it('classifies unknown shapes', () => {
			expect(classifyTestCaseSteps(['a', 'b'])).toBe('unknown');
			expect(classifyTestCaseSteps({ step: 1 })).toBe('unknown');
		});
	});

	describe('getStructuredTestCaseSteps', () => {
		it('returns normalized structured steps with default order', () => {
			expect(
				getStructuredTestCaseSteps([
					{ action: 'Open', expectedResult: 'Shown' },
					{ action: 'Tap', order: 5 }
				])
			).toEqual([
				{ action: 'Open', expectedResult: 'Shown', order: 0 },
				{ action: 'Tap', order: 5 }
			]);
		});

		it('returns null for non-structured values', () => {
			expect(getStructuredTestCaseSteps('plain')).toBeNull();
			expect(getStructuredTestCaseSteps(null)).toBeNull();
		});
	});

	describe('normalizeStructuredStepsForSave', () => {
		it('trims fields and fills missing order', () => {
			expect(
				normalizeStructuredStepsForSave([
					{ action: '  Open  ', expectedResult: '  Shown  ' },
					{ action: 'Tap', expectedResult: '   ', order: 3 }
				])
			).toEqual([
				{ action: 'Open', expectedResult: 'Shown', order: 0 },
				{ action: 'Tap', order: 3 }
			]);
		});
	});

	describe('formatTestCaseStepsForText', () => {
		it('formats structured steps as numbered lines', () => {
			expect(
				formatTestCaseStepsForText([
					{ action: 'Open the app', expectedResult: 'Welcome screen', order: 0 },
					{ action: 'Tap Login', order: 1 }
				])
			).toBe('1. Open the app → Welcome screen\n2. Tap Login');
		});

		it('returns plain strings unchanged', () => {
			expect(formatTestCaseStepsForText('Step 1\nStep 2')).toBe('Step 1\nStep 2');
		});
	});
});
