import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';

export const Params = z.object({
	projectId: z.string().describe('Project ID'),
	id: z.string().describe('Milestone ID')
});

export const Output = z.object({
	id: z.string().describe('Milestone ID'),
	name: z.string().describe('Milestone name'),
	description: z.string().nullable().describe('Milestone description'),
	dueDate: z.coerce.string().nullable().describe('ISO 8601 due date'),
	status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).describe('Milestone status'),
	projectId: z.string().describe('Project ID'),
	createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
	updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp'),
	testRuns: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED']),
				createdAt: z.coerce.string()
			})
		)
		.describe('Recent test runs (last 10)'),
	_count: z
		.object({
			testRuns: z.number()
		})
		.describe('Count of associated test runs')
});

export const Modifier = (r: any) => {
	r.tags = ['Milestones'];
	r.summary = 'Get milestone details';
	r.description =
		'Retrieve detailed information for a specific milestone including recent test runs and statistics.';
	return r;
};

/**
 * GET /api/projects/[projectId]/milestones/[id]
 * Get detailed milestone with test runs
 */
export default new Endpoint({ Params, Output, Modifier }).handle(
	async ({ projectId, id }): Promise<any> => {
		const milestone = await db.milestone.findFirst({
			where: {
				id,
				projectId
			},
			include: {
				_count: {
					select: { testRuns: true }
				},
				testRuns: {
					orderBy: { createdAt: 'desc' },
					take: 10
				}
			}
		});

		if (!milestone) {
			throw new Error('Milestone not found');
		}

		return serializeDates(milestone);
	}
);
