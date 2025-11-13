import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
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
export default new Endpoint({ Param, Input, Output, Modifier }).handle(
	async (input, event): Promise<any> => {
		const { projectId, id, name, description, dueDate, status } = input;
		const userId = await requireApiAuth(event);

		// Verify project access
		const project = await db.project.findUnique({
			where: { id: projectId },
			include: { team: true }
		});

		if (!project) {
			throw error(404, 'Project not found');
		}

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Check access
		const hasAccess =
			project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

		if (!hasAccess) {
			throw error(403, 'You do not have access to this project');
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
		if (status !== undefined) updateData.status = status;

		const milestone = await db.milestone.update({
			where: { id },
			data: updateData
		});

		if (!milestone) {
			throw error(404, 'Milestone not found');
		}

		return serializeDates(milestone);
	}
);
