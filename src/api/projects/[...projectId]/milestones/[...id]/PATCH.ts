import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';

export const Params = z.object({
	projectId: z.string().describe('Project ID'),
	id: z.string().describe('Milestone ID')
});

export const Input = z.object({
	name: z.string().optional().describe('Milestone name'),
	description: z.string().optional().nullable().describe('Milestone description'),
	dueDate: z.coerce.string().optional().nullable().describe('ISO 8601 due date'),
	status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional().describe('Milestone status')
});

export const Output = z.object({
	id: z.string().describe('Milestone ID'),
	name: z.string().describe('Milestone name'),
	description: z.string().nullable().describe('Milestone description'),
	dueDate: z.coerce.string().nullable().describe('ISO 8601 due date'),
	status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).describe('Milestone status'),
	projectId: z.string().describe('Project ID'),
	createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
	updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp')
});

export const Modifier = (r: any) => {
	r.tags = ['Milestones'];
	r.summary = 'Update milestone';
	r.description = 'Update an existing milestone with new information.';
	return r;
};

/**
 * PATCH /api/projects/[projectId]/milestones/[id]
 * Update milestone
 */
export default new Endpoint({ Params, Input, Output, Modifier }).handle(
	async ({ projectId, id }, input): Promise<any> => {
		const updateData: any = {};
		if (input.name !== undefined) updateData.name = input.name;
		if (input.description !== undefined) updateData.description = input.description;
		if (input.dueDate !== undefined)
			updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
		if (input.status !== undefined) updateData.status = input.status;

		const milestone = await db.milestone.update({
			where: { id },
			data: updateData
		});

		return serializeDates(milestone);
	}
);
