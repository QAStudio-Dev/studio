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

export const testResultStepsSelect = {
	where: { parentStepId: null },
	orderBy: { stepNumber: 'asc' as const },
	select: {
		id: true,
		stepNumber: true,
		description: true,
		status: true,
		duration: true,
		errorMessage: true,
		childSteps: {
			orderBy: { stepNumber: 'asc' as const },
			select: {
				id: true,
				stepNumber: true,
				description: true,
				status: true,
				duration: true,
				errorMessage: true
			}
		}
	}
} as const;
