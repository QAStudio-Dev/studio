import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string(),
	id: z.string()
});

export const Output = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	projectId: z.string(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string(),
	_count: z.object({
		testRuns: z.number()
	})
});

export const Error = {
	404: error(404, 'Environment not found'),
	500: error(500, 'Failed to fetch environment')
};

export const Modifier = (r: any) => {
	r.tags = ['Environments'];
	r.summary = 'Get an environment';
	r.description = 'Returns a single environment by ID with test run count.';
	return r;
};

export default new Endpoint({ Param, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			const environment = await db.environment.findFirst({
				where: {
					id: input.id,
					projectId: input.projectId
				},
				include: {
					_count: {
						select: { testRuns: true }
					}
				}
			});

			if (!environment) {
				throw Error[404];
			}

			return serializeDates(environment);
		} catch (err: any) {
			if (err === Error[404]) throw err;
			throw Error[500];
		}
	}
);
