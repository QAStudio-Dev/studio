import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { requireProjectAccess } from '$lib/server/authorization';

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

export const Modifier = (r: Record<string, unknown>) => {
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
export default new Endpoint({ Param, Output, Error, Modifier }).handle(async (input, event) => {
	const userId = await requireApiAuth(event);
	const { projectId, id } = input;

	// Verify project access using shared helper
	await requireProjectAccess(userId, projectId);

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
	// Include projectId for defense-in-depth security
	await db.testRun.delete({
		where: {
			id,
			projectId
		}
	});

	return {
		success: true,
		message: 'Test run deleted successfully'
	};
});
