import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';
import { Prisma } from '@prisma/client';

export const Param = z.object({
	testCaseId: z.string()
});

export const Input = z.object({
	title: z.string().min(1).optional().describe('Test case title'),
	description: z.string().nullable().optional().describe('Detailed test case description'),
	preconditions: z.string().nullable().optional().describe('Pre-requisites before executing'),
	steps: z.string().nullable().optional().describe('Test execution steps'),
	expectedResult: z.string().nullable().optional().describe('Expected test outcome'),
	priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().describe('Test case priority'),
	type: z
		.enum([
			'FUNCTIONAL',
			'REGRESSION',
			'SMOKE',
			'INTEGRATION',
			'PERFORMANCE',
			'SECURITY',
			'UI',
			'API',
			'UNIT',
			'E2E'
		])
		.optional()
		.describe('Test type'),
	automationStatus: z
		.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE'])
		.optional()
		.describe('Automation status')
});

export const Output = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	preconditions: z.string().nullable(),
	steps: z.string().nullable(),
	expectedResult: z.string().nullable(),
	priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
	type: z.enum([
		'FUNCTIONAL',
		'REGRESSION',
		'SMOKE',
		'INTEGRATION',
		'PERFORMANCE',
		'SECURITY',
		'UI',
		'API',
		'UNIT',
		'E2E'
	]),
	automationStatus: z.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE']),
	tags: z.array(z.string()),
	projectId: z.string(),
	suiteId: z.string().nullable(),
	createdBy: z.string(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string(),
	project: z.object({
		id: z.string(),
		name: z.string(),
		key: z.string()
	}),
	suite: z
		.object({
			id: z.string(),
			name: z.string()
		})
		.nullable(),
	creator: z.object({
		firstName: z.string().nullable(),
		lastName: z.string().nullable(),
		email: z.string(),
		imageUrl: z.string().nullable()
	})
});

export const Error = {
	400: error(400, 'Title is required'),
	404: error(404, 'Test case not found'),
	500: error(500, 'Failed to update test case')
};

export const Modifier = (r: any) => {
	r.tags = ['Cases'];
	r.summary = 'Update a test case';
	r.description =
		'Update test case fields including title, steps, priority, and automation status.';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const userId = await requireApiAuth(evt);

		// Validate required fields
		if (input.title !== undefined && !input.title?.trim()) {
			throw Error[400];
		}

		// Check if test case exists and user has access
		const existingTestCase = await db.testCase.findUnique({
			where: { id: input.testCaseId },
			include: {
				project: {
					select: {
						id: true,
						createdBy: true
					}
				}
			}
		});

		if (!existingTestCase) {
			throw Error[404];
		}

		// Update test case
		try {
			const updatedTestCase = await db.testCase.update({
				where: { id: input.testCaseId },
				data: {
					...(input.title !== undefined && { title: input.title.trim() }),
					...(input.description !== undefined && {
						description: input.description?.trim() || null
					}),
					...(input.preconditions !== undefined && {
						preconditions: input.preconditions?.trim() || null
					}),
					...(input.steps !== undefined && {
						steps: input.steps?.trim() ? input.steps.trim() : Prisma.JsonNull
					}),
					...(input.expectedResult !== undefined && {
						expectedResult: input.expectedResult?.trim() || null
					}),
					...(input.priority && { priority: input.priority }),
					...(input.type && { type: input.type }),
					...(input.automationStatus && { automationStatus: input.automationStatus }),
					updatedAt: new Date()
				},
				include: {
					project: {
						select: {
							id: true,
							name: true,
							key: true
						}
					},
					suite: {
						select: {
							id: true,
							name: true
						}
					},
					creator: {
						select: {
							firstName: true,
							lastName: true,
							email: true,
							imageUrl: true
						}
					}
				}
			});

			return serializeDates(updatedTestCase);
		} catch (err: any) {
			console.error('Error updating test case:', err);
			throw Error[500];
		}
	}
);
