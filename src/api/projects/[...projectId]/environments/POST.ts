import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { generateEnvironmentId } from '$lib/server/ids';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string()
});

export const Input = z.object({
	name: z.string().min(1).describe('Environment name (e.g., Production, Staging, QA)'),
	description: z.string().optional().describe('Optional environment description')
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
	400: error(400, 'Name is required'),
	404: error(404, 'Project not found'),
	409: error(409, 'Environment name already exists in this project'),
	500: error(500, 'Failed to create environment')
};

export const Modifier = (r: any) => {
	r.tags = ['Environments'];
	r.summary = 'Create an environment';
	r.description =
		'Create a new testing environment for organizing test runs by deployment target.';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			const environment = await db.environment.create({
				data: {
					id: generateEnvironmentId(),
					name: input.name,
					description: input.description,
					projectId: input.projectId
				}
			});

			return serializeDates(environment);
		} catch (err: any) {
			if (err.code === 'P2003') {
				throw Error[404];
			}
			if (err.code === 'P2002') {
				throw Error[409];
			}
			throw Error[500];
		}
	}
);
