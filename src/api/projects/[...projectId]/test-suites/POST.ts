import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { generateTestSuiteId } from '$lib/server/ids';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string()
});

export const Input = z.object({
	name: z.string().min(1).describe('Suite name'),
	description: z.string().optional().describe('Optional suite description'),
	parentId: z.string().nullable().optional().describe('Parent suite ID for nesting')
});

export const Output = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	parentId: z.string().nullable(),
	projectId: z.string(),
	order: z.number(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string()
});

export const Error = {
	400: error(400, 'Name is required'),
	404: error(404, 'Project or parent suite not found'),
	500: error(500, 'Failed to create test suite')
};

export const Modifier = (r: any) => {
	r.tags = ['Suites'];
	r.summary = 'Create a test suite';
	r.description =
		'Create a new test suite for organizing test cases. Supports hierarchical nesting via parentId.';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			const testSuite = await db.testSuite.create({
				data: {
					id: generateTestSuiteId(),
					name: input.name,
					description: input.description,
					projectId: input.projectId,
					parentId: input.parentId || null
				}
			});

			return serializeDates(testSuite);
		} catch (err: any) {
			if (err.code === 'P2003') {
				throw Error[404];
			}
			throw Error[500];
		}
	}
);
