import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string(),
	id: z.string()
});

export const Input = z.object({
	name: z.string().optional().describe('Environment name'),
	description: z.string().optional().describe('Environment description')
});

export const Output = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	projectId: z.string(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string()
});

export const Error = {
	404: error(404, 'Environment not found'),
	409: error(409, 'Environment name already exists in this project'),
	500: error(500, 'Failed to update environment')
};

export const Modifier = (r: any) => {
	r.tags = ['Environments'];
	r.summary = 'Update an environment';
	r.description = 'Update environment name or description.';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			const updateData: any = {};
			if (input.name !== undefined) updateData.name = input.name;
			if (input.description !== undefined) updateData.description = input.description;

			const environment = await db.environment.update({
				where: { id: input.id },
				data: updateData
			});

			return serializeDates(environment);
		} catch (err: any) {
			if (err.code === 'P2025') {
				throw Error[404];
			}
			if (err.code === 'P2002') {
				throw Error[409];
			}
			throw Error[500];
		}
	}
);
