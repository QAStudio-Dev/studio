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
	parentId: z.string().nullable(),
	projectId: z.string(),
	order: z.number(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string(),
	parent: z
		.object({
			id: z.string(),
			name: z.string()
		})
		.nullable(),
	children: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			_count: z.object({
				testCases: z.number()
			})
		})
	),
	testCases: z.array(z.any()),
	_count: z.object({
		testCases: z.number(),
		children: z.number()
	})
});

export const Error = {
	404: error(404, 'Test suite not found'),
	500: error(500, 'Failed to fetch test suite')
};

export const Modifier = (r: any) => {
	r.tags = ['Suites'];
	r.summary = 'Get a test suite';
	r.description = 'Returns a single test suite with children, parent, and test cases.';
	return r;
};

export default new Endpoint({ Param, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			const testSuite = await db.testSuite.findFirst({
				where: {
					id: input.id,
					projectId: input.projectId
				},
				include: {
					parent: {
						select: {
							id: true,
							name: true
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
					},
					testCases: {
						orderBy: { createdAt: 'desc' },
						include: {
							_count: {
								select: {
									results: true
								}
							}
						}
					},
					_count: {
						select: {
							testCases: true,
							children: true
						}
					}
				}
			});

			if (!testSuite) {
				throw Error[404];
			}

			return serializeDates(testSuite);
		} catch (err: any) {
			if (err === Error[404]) throw err;
			throw Error[500];
		}
	}
);
