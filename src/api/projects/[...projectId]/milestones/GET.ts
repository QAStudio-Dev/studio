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
		dueDate: z.coerce.string().nullable(),
		status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
		projectId: z.string(),
		createdAt: z.coerce.string(),
		updatedAt: z.coerce.string(),
		_count: z.object({
			testRuns: z.number()
		})
	})
);

export const Modifier = (r: any) => {
	r.tags = ['Milestones'];
	r.summary = 'List milestones';
	r.description = 'Returns all milestones for a project';
	return r;
};

export default new Endpoint({ Param, Output, Modifier }).handle(async (input): Promise<any> => {
	const milestones = await db.milestone.findMany({
		where: { projectId: input.projectId },
		orderBy: { createdAt: 'desc' },
		include: {
			_count: {
				select: { testRuns: true }
			}
		}
	});

	return serializeDates(milestones);
});
