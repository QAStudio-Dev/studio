import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string()
});

export const Output = z.array(
	z.object({
		id: z.string(),
		name: z.string(),
		description: z.string().nullable(),
		projectId: z.string(),
		createdAt: z.coerce.string(),
		updatedAt: z.coerce.string(),
		_count: z.object({
			testRuns: z.number()
		})
	})
);

export const Modifier = (r: any) => {
	r.tags = ['Environments'];
	r.summary = 'List environments';
	r.description =
		'Returns all testing environments for a project (Production, Staging, QA, etc.)';
	return r;
};

export default new Endpoint({ Param, Output, Modifier }).handle(async (input): Promise<any> => {
	const environments = await db.environment.findMany({
		where: { projectId: input.projectId },
		orderBy: { name: 'asc' },
		include: {
			_count: {
				select: { testRuns: true }
			}
		}
	});

	return serializeDates(environments);
});
