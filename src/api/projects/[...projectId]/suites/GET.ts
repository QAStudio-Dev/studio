import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string()
});

export const Query = z.object({
	parentId: z
		.string()
		.optional()
		.describe('Filter by parent suite ID (use "null" for root level)')
});

export const Output = z.array(
	z.object({
		id: z.string(),
		name: z.string(),
		description: z.string().nullable(),
		parentId: z.string().nullable(),
		projectId: z.string(),
		order: z.number(),
		createdAt: z.coerce.string(),
		updatedAt: z.coerce.string(),
		_count: z.object({
			testCases: z.number(),
			children: z.number()
		}),
		children: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				_count: z.object({
					testCases: z.number()
				})
			})
		)
	})
);

export const Modifier = (r: any) => {
	r.tags = ['Suites'];
	r.summary = 'List test suites';
	r.description =
		'Returns all test suites for a project. Supports hierarchical organization with optional parent filtering.';
	return r;
};

export default new Endpoint({ Param, Query, Output, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const url = new URL(evt.request.url);
		const parentId = url.searchParams.get('parentId');

		const where: any = { projectId: input.projectId };

		// If parentId is provided, filter by it. If 'null', get root level suites
		if (parentId === 'null') {
			where.parentId = null;
		} else if (parentId) {
			where.parentId = parentId;
		}

		const testSuites = await db.testSuite.findMany({
			where,
			orderBy: { name: 'asc' },
			include: {
				_count: {
					select: {
						testCases: true,
						children: true
					}
				},
				children: {
					select: {
						id: true,
						name: true,
						_count: {
							select: {
								testCases: true
							}
						}
					}
				}
			}
		});

		return serializeDates(testSuites);
	}
);
