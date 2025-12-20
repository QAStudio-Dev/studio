import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { requireProjectAccess } from '$lib/server/authorization';
import { serializeDates } from '$lib/utils/date';
import { Prisma } from '$prisma/client';

export const Param = z.object({
	projectId: z.string().describe('Project ID'),
	id: z.string().describe('Test run ID')
});

export const Input = z.object({
	name: z.string().min(1).max(255).optional().describe('Test run name'),
	description: z.string().max(2000).nullish().describe('Test run description'),
	status: z
		.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'])
		.optional()
		.describe('Test run status'),
	milestoneId: z.string().nullish().describe('Milestone ID (null to unlink)'),
	environmentId: z.string().nullish().describe('Environment ID (null to unlink)')
});

export const Output = z.object({
	id: z.string().describe('Test run ID'),
	name: z.string().describe('Test run name'),
	description: z.string().nullable().describe('Test run description'),
	projectId: z.string().describe('Project ID'),
	milestoneId: z.string().nullable().describe('Milestone ID'),
	environmentId: z.string().nullable().describe('Environment ID'),
	status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED']).describe('Test run status'),
	createdBy: z.string().describe('User ID who created the run'),
	startedAt: z.coerce.string().nullable().describe('ISO 8601 start timestamp'),
	completedAt: z.coerce.string().nullable().describe('ISO 8601 completion timestamp'),
	createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
	updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp')
});

export const Error = {
	400: error(400, 'Invalid request'),
	403: error(403, 'Access denied'),
	404: error(404, 'Test run or project not found')
};

export const Modifier = (r: Record<string, unknown>) => {
	r.tags = ['Projects'];
	r.summary = 'Update test run';
	r.description =
		'Update test run details including name, description, status, milestone, and environment.';
	return r;
};

/**
 * PATCH /api/projects/[projectId]/runs/[id]
 * Update a test run
 */
export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input, event) => {
		const userId = await requireApiAuth(event);
		const { projectId, id, ...updateData } = input;

		// Verify project access using shared helper
		await requireProjectAccess(userId, projectId);

		// Verify test run exists in this project
		const existingRun = await db.testRun.findFirst({
			where: {
				id,
				projectId
			}
		});

		if (!existingRun) {
			throw error(404, 'Test run not found');
		}

		// If milestone is being set, verify it exists and belongs to the project
		if (updateData.milestoneId) {
			const milestone = await db.milestone.findFirst({
				where: {
					id: updateData.milestoneId,
					projectId
				}
			});

			if (!milestone) {
				throw error(400, 'Milestone not found in this project');
			}
		}

		// If environment is being set, verify it exists and belongs to the project
		if (updateData.environmentId) {
			const environment = await db.environment.findFirst({
				where: {
					id: updateData.environmentId,
					projectId
				}
			});

			if (!environment) {
				throw error(400, 'Environment not found in this project');
			}
		}

		// Build update data, handling null values for milestoneId and environmentId
		const data: Prisma.TestRunUpdateInput = {};

		if (updateData.name !== undefined) {
			data.name = updateData.name;
		}

		if (updateData.description !== undefined) {
			data.description = updateData.description;
		}

		if (updateData.status !== undefined) {
			data.status = updateData.status;

			// Update timestamps based on status
			if (updateData.status === 'IN_PROGRESS' && !existingRun.startedAt) {
				data.startedAt = new Date();
			}

			if (updateData.status === 'COMPLETED' && !existingRun.completedAt) {
				data.completedAt = new Date();
			}

			if (updateData.status === 'ABORTED' && !existingRun.completedAt) {
				data.completedAt = new Date();
			}
		}

		if (updateData.milestoneId !== undefined) {
			data.milestoneId = updateData.milestoneId;
		}

		if (updateData.environmentId !== undefined) {
			data.environmentId = updateData.environmentId;
		}

		// Update the test run
		const updatedRun = await db.testRun.update({
			where: { id },
			data
		});

		return serializeDates(updatedRun);
	}
);
