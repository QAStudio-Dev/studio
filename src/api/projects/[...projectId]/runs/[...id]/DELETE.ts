import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';

export const Param = z.object({
	projectId: z.string().describe('Project ID'),
	id: z.string().describe('Test run ID')
});

export const Output = z.object({
	success: z.boolean().describe('Operation success status'),
	message: z.string().describe('Success message')
});

export const Error = {
	403: error(403, 'Access denied'),
	404: error(404, 'Test run or project not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'Delete test run';
	r.description =
		'Delete a test run and all associated test results, attachments, and step results.';
	return r;
};

/**
 * DELETE /api/projects/[projectId]/runs/[id]
 * Delete a test run and all associated data
 */
export default new Endpoint({ Param, Output, Error, Modifier }).handle(
	async (input, event): Promise<any> => {
		const userId = await requireApiAuth(event);
		const { projectId, id } = input;

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

		// Verify test run exists in this project
		const testRun = await db.testRun.findFirst({
			where: {
				id,
				projectId
			}
		});

		if (!testRun) {
			throw error(404, 'Test run not found');
		}

		// Delete the test run (cascade will delete results, attachments, steps)
		await db.testRun.delete({
			where: { id }
		});

		return {
			success: true,
			message: 'Test run deleted successfully'
		};
	}
);
