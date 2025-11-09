import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { generateMilestoneId } from '$lib/server/ids';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string()
});

export const Input = z.object({
	name: z.string().min(1).describe('Milestone name'),
	description: z.string().optional().describe('Optional description'),
	dueDate: z.string().optional().describe('Due date (ISO format)'),
	status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional().describe('Milestone status')
});

export const Output = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	dueDate: z.coerce.string().nullable(),
	status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
	projectId: z.string(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string()
});

export const Error = {
	400: error(400, 'Name is required'),
	404: error(404, 'Project not found'),
	500: error(500, 'Failed to create milestone')
};

export const Modifier = (r: any) => {
	r.tags = ['Milestones'];
	r.summary = 'Create a milestone';
	r.description = 'Create a new milestone for tracking release goals and test progress';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			const milestone = await db.milestone.create({
				data: {
					id: generateMilestoneId(),
					name: input.name,
					description: input.description,
					dueDate: input.dueDate ? new Date(input.dueDate) : null,
					status: input.status || 'ACTIVE',
					projectId: input.projectId
				}
			});

			return serializeDates(milestone);
		} catch (err: any) {
			if (err.code === 'P2003') {
				throw Error[404];
			}
			throw Error[500];
		}
	}
);
