import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';
import { getCachedOrFetch, CacheKeys, CacheTTL } from '$lib/server/redis';

export const Param = z.object({
	id: z.string()
});

export const Output = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	key: z.string(),
	createdBy: z.string(),
	teamId: z.string().nullable(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string(),
	_count: z.object({
		testCases: z.number(),
		testRuns: z.number(),
		testSuites: z.number(),
		milestones: z.number(),
		environments: z.number()
	}),
	milestones: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
			dueDate: z.coerce.string().nullable(),
			createdAt: z.coerce.string(),
			description: z.string().nullable(),
			updatedAt: z.coerce.string(),
			projectId: z.string()
		})
	),
	environments: z.array(
		z.object({
			id: z.string(),
			name: z.string()
		})
	)
});

export const Error = {
	404: error(404, 'Project not found'),
	500: error(500, 'Failed to fetch project')
};

export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'Get a single project';
	r.description = 'Returns a single project with related counts (milestones, environments, etc.)';
	return r;
};

export default new Endpoint({ Param, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		return getCachedOrFetch(
			CacheKeys.project(input.id),
			async () => {
				const project = await db.project.findUnique({
					where: { id: input.id },
					include: {
						_count: {
							select: {
								testCases: true,
								testRuns: true,
								testSuites: true,
								milestones: true,
								environments: true
							}
						},
						milestones: {
							orderBy: { createdAt: 'desc' },
							take: 5
						},
						environments: {
							orderBy: { name: 'asc' }
						}
					}
				});

				if (!project) {
					throw Error[404];
				}

				return serializeDates(project);
			},
			CacheTTL.project
		);
	}
);
