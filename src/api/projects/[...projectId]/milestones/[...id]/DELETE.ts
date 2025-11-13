import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';

export const Params = z.object({
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
export default new Endpoint({ Params, Output, Modifier }).handle(
	async ({ projectId, id }): Promise<any> => {
		await db.milestone.delete({
			where: { id }
		});

		return { success: true };
	}
);
