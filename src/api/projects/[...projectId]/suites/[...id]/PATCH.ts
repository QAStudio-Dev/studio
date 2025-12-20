import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string(),
	id: z.string()
});

export const Input = z.object({
	name: z.string().optional().describe('Suite name'),
	description: z.string().optional().describe('Suite description'),
	parentId: z.string().nullable().optional().describe('Parent suite ID')
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
	404: error(404, 'Test suite not found'),
	500: error(500, 'Failed to update test suite')
};

export const Modifier = (r: any) => {
	r.tags = ['Suites'];
	r.summary = 'Update a test suite';
	r.description = 'Update test suite name, description, or parent (for moving in hierarchy).';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			const updateData: any = {};
			if (input.name !== undefined) updateData.name = input.name;
			if (input.description !== undefined) updateData.description = input.description;
			if (input.parentId !== undefined) updateData.parentId = input.parentId;

			const testSuite = await db.testSuite.update({
				where: { id: input.id },
				data: updateData
			});

			return serializeDates(testSuite);
		} catch (err: any) {
			if (err.code === 'P2025') {
				throw Error[404];
			}
			throw Error[500];
		}
	}
);
