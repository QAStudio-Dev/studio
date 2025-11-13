import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';

export const Param = z.object({
	projectId: z.string().describe('Project ID'),
	id: z.string().describe('Milestone ID')
});

export const Output = z.object({
	success: z.boolean().describe('Whether the deletion was successful')
});

export const Modifier = (r: any) => {
	r.tags = ['Milestones'];
	r.summary = 'Delete milestone';
	r.description = 'Delete an existing milestone from the project.';
	return r;
};

/**
 * DELETE /api/projects/[projectId]/milestones/[id]
 * Delete milestone
 */
export default new Endpoint({ Param, Output, Modifier }).handle(
	async (input, event): Promise<any> => {
		const { projectId, id } = input;
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

		await db.milestone.delete({
			where: { id }
		});

		return { success: true };
	}
);
