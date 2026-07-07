/**
 * Nested step depth for Prisma. TestStepsViewer renders one child level only.
 */
export const testResultStepsInclude = {
	where: { parentStepId: null },
	orderBy: { stepNumber: 'asc' as const },
	include: {
		childSteps: {
			orderBy: { stepNumber: 'asc' as const }
		}
	}
} as const;

const testStepFieldsSelect = {
	id: true,
	stepNumber: true,
	title: true,
	category: true,
	status: true,
	duration: true,
	error: true
} as const;

export const testResultStepsSelect = {
	where: { parentStepId: null },
	orderBy: { stepNumber: 'asc' as const },
	select: {
		...testStepFieldsSelect,
		childSteps: {
			orderBy: { stepNumber: 'asc' as const },
			select: testStepFieldsSelect
		}
	}
} as const;
