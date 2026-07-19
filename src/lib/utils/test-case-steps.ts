/**
 * Helpers for TestCase.steps JSON values.
 *
 * The create API stores structured step objects, while the legacy UI
 * textarea path stores plain strings. Both shapes live in the same Json column.
 */

export type StructuredTestCaseStep = {
	action: string;
	expectedResult?: string;
	order?: number;
};

export type TestCaseStepsKind = 'empty' | 'string' | 'structured' | 'unknown';

export function isStructuredTestCaseStep(value: unknown): value is StructuredTestCaseStep {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		typeof (value as { action?: unknown }).action === 'string'
	);
}

export function classifyTestCaseSteps(steps: unknown): TestCaseStepsKind {
	if (steps == null) return 'empty';
	if (typeof steps === 'string') {
		return steps.trim() === '' ? 'empty' : 'string';
	}
	if (Array.isArray(steps)) {
		if (steps.length === 0) return 'empty';
		if (steps.every(isStructuredTestCaseStep)) return 'structured';
		return 'unknown';
	}
	return 'unknown';
}

export function getStructuredTestCaseSteps(steps: unknown): StructuredTestCaseStep[] | null {
	if (classifyTestCaseSteps(steps) !== 'structured') return null;
	return (steps as StructuredTestCaseStep[]).map((step, index) => ({
		action: step.action,
		...(step.expectedResult !== undefined ? { expectedResult: step.expectedResult } : {}),
		order: step.order ?? index
	}));
}

export function normalizeStructuredStepsForSave(
	steps: StructuredTestCaseStep[]
): StructuredTestCaseStep[] {
	return steps.map((step, index) => ({
		action: step.action.trim(),
		...(step.expectedResult !== undefined && step.expectedResult.trim() !== ''
			? { expectedResult: step.expectedResult.trim() }
			: {}),
		order: step.order ?? index
	}));
}

/** Human-readable text for clipboard / Jira export. */
export function formatTestCaseStepsForText(steps: unknown): string {
	const kind = classifyTestCaseSteps(steps);
	if (kind === 'empty') return '';
	if (kind === 'string') return steps as string;
	if (kind === 'structured') {
		return (steps as StructuredTestCaseStep[])
			.map((step, index) => {
				const order = step.order ?? index;
				const expected = step.expectedResult?.trim()
					? ` → ${step.expectedResult.trim()}`
					: '';
				return `${order + 1}. ${step.action}${expected}`;
			})
			.join('\n');
	}
	try {
		return JSON.stringify(steps, null, 2);
	} catch {
		return String(steps);
	}
}
