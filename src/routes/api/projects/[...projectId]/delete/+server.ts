import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Delete a project
 * DELETE /api/projects/[projectId]/delete
 */
export const DELETE: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { projectId } = event.params;

	// Get project with team info
	const project = await db.project.findUnique({
		where: { id: projectId },
		include: {
			team: true
		}
	});

	if (!project) {
		throw error(404, { message: 'Project not found' });
	}

	// Get user with team info
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	// Check permissions: user must be creator or team member
	const hasAccess =
		project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have permission to delete this project' });
	}

	// Delete the project (cascade will delete all related data)
	await db.project.delete({
		where: { id: projectId }
	});

	return json({ success: true });
};
