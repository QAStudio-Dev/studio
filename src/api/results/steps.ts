import { db } from '$lib/server/db';
import { generateTestStepId } from '$lib/server/ids';

export type TestStepInput = {
	title: string;
	category?: 'hook' | 'test.step' | 'pw:api' | 'expect' | 'fixture' | 'other';
	status?: 'passed' | 'failed' | 'skipped' | 'timedout';
	startTime?: string;
	duration?: number;
	error?: string;
	stackTrace?: string;
	location?: { file: string; line: number; column?: number };
	steps?: TestStepInput[];
};

export type FlattenedTestStep = {
	id: string;
	testResultId: string;
	parentStepId: string | null;
	stepNumber: number;
	title: string;
	category: string | null;
	status: 'PASSED' | 'FAILED' | 'SKIPPED';
	duration: number | null;
	startTime: Date | null;
	error: string | null;
	stackTrace: string | null;
	location: { file: string; line: number; column?: number } | undefined;
};

/**
 * Parse and validate ISO 8601 date string
 */
export function parseDateTime(dateString: string | undefined): Date | null {
	if (!dateString) return null;
	const date = new Date(dateString);
	return isNaN(date.getTime()) ? null : date;
}

/**
 * Map test/step status to TestStatus enum
 */
export function mapStatus(
	status: string | undefined,
	logWarning = false
): 'PASSED' | 'FAILED' | 'SKIPPED' {
	const normalized = status?.toLowerCase();
	switch (normalized) {
		case 'passed':
			return 'PASSED';
		case 'failed':
		case 'timedout':
			return 'FAILED';
		case 'skipped':
		case 'interrupted':
			return 'SKIPPED';
		default:
			if (logWarning && status) {
				console.warn(`Unknown status "${status}" defaulting to SKIPPED`);
			}
			return 'SKIPPED';
	}
}

/**
 * Flatten a nested Playwright step tree into rows that can be inserted with createMany.
 * Parent ids are generated up front so nested rows can set parentStepId in one pass.
 */
export function flattenTestSteps(
	steps: TestStepInput[],
	testResultId: string,
	parentStepId: string | null = null
): FlattenedTestStep[] {
	if (!steps || steps.length === 0) return [];

	const rows: FlattenedTestStep[] = [];

	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		const id = generateTestStepId();

		rows.push({
			id,
			testResultId,
			parentStepId,
			stepNumber: i,
			title: step.title || 'Untitled Step',
			category: step.category || null,
			status: mapStatus(step.status, true),
			duration: step.duration ?? null,
			startTime: parseDateTime(step.startTime),
			error: step.error || null,
			stackTrace: step.stackTrace || null,
			location: step.location || undefined
		});

		if (step.steps && Array.isArray(step.steps) && step.steps.length > 0) {
			rows.push(...flattenTestSteps(step.steps, testResultId, id));
		}
	}

	return rows;
}

/**
 * Bulk-insert nested test steps for a result.
 * Individual createMany failures are logged and do not fail the parent result.
 */
export async function processTestSteps(
	steps: TestStepInput[],
	testResultId: string
): Promise<void> {
	if (!steps || steps.length === 0) return;

	const rows = flattenTestSteps(steps, testResultId);
	if (rows.length === 0) return;

	try {
		await db.testStepResult.createMany({ data: rows });
	} catch (err: any) {
		console.error(
			`Failed to bulk insert ${rows.length} steps for testResultId ${testResultId}:`,
			err.message
		);
	}
}
