import { describe, it, expect } from 'vitest';
import { isIdUniqueConflict, prismaUniqueTargets } from './prisma-unique';

describe('prisma unique constraint helpers', () => {
	it('reads array and string meta.target values', () => {
		expect(prismaUniqueTargets({ code: 'P2002', meta: { target: ['id'] } })).toEqual(['id']);
		expect(prismaUniqueTargets({ code: 'P2002', meta: { target: 'id' } })).toEqual(['id']);
		expect(
			prismaUniqueTargets({
				code: 'P2002',
				meta: { target: ['testCaseId', 'testRunId', 'retry'] }
			})
		).toEqual(['testCaseId', 'testRunId', 'retry']);
	});

	it('treats TestResult_pkey messages as id collisions when meta.target is missing', () => {
		const error = {
			code: 'P2002',
			message: 'Unique constraint failed on the constraint: `TestResult_pkey`'
		};
		expect(prismaUniqueTargets(error)).toEqual(['id']);
		expect(isIdUniqueConflict(error)).toBe(true);
	});

	it('does not treat the per-run duplicate index as an id collision', () => {
		const error = {
			code: 'P2002',
			meta: { target: ['testCaseId', 'testRunId', 'retry'] }
		};
		expect(isIdUniqueConflict(error)).toBe(false);
	});

	it('ignores non-P2002 errors', () => {
		expect(prismaUniqueTargets({ code: 'P2003', meta: { target: ['id'] } })).toEqual([]);
		expect(isIdUniqueConflict(new Error('boom'))).toBe(false);
	});
});
