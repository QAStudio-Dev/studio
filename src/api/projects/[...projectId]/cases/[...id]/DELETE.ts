import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { requireProjectAccess } from '$lib/server/authorization';
import { createAuditLog } from '$lib/server/audit';

export const Param = z.object({
	projectId: z.string().describe('Project ID'),
	id: z.string().describe('Test case ID')
});

export const Output = z.object({
	success: z.boolean().describe('Operation success status'),
	message: z.string().describe('Success message')
});

export const Error = {
	403: error(403, 'Access denied'),
	404: error(404, 'Test case or project not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Cases'];
	r.summary = 'Delete test case';
	r.description =
		'Delete a test case and all associated test results, attachments, and step results.';
	return r;
};

/**
 * DELETE /api/projects/[projectId]/cases/[id]
 * Delete a test case and all associated data
 */
export default new Endpoint({ Param, Output, Error, Modifier }).handle(async (input, event) => {
	const userId = await requireApiAuth(event);
	const { projectId, id } = input;

	const { project } = await requireProjectAccess(userId, projectId);

	const deletedTestCase = await db.$transaction(async (tx) => {
		const testCase = await tx.testCase.findFirst({
			where: {
				id,
				projectId
			}
		});

		if (!testCase) {
			throw error(404, 'Test case not found');
		}

		await tx.testCase.delete({
			where: { id }
		});

		return testCase;
	});

	try {
		await createAuditLog({
			userId,
			teamId: project.teamId ?? undefined,
			action: 'TEST_CASE_DELETED',
			resourceType: 'TestCase',
			resourceId: id,
			metadata: {
				testCaseTitle: deletedTestCase.title,
				projectId
			},
			event
		});
	} catch (auditError) {
		console.error('Failed to create audit log for test case deletion:', auditError);
	}

	return {
		success: true,
		message: 'Test case deleted successfully'
	};
});
