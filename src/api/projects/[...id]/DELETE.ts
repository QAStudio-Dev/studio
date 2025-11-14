import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { deleteCache, CacheKeys } from '$lib/server/redis';
import { requireApiAuth } from '$lib/server/api-auth';

export const Param = z.object({
	id: z.string()
});

export const Output = z.object({
	success: z.boolean()
});

export const Error = {
	404: error(404, 'Project not found'),
	500: error(500, 'Failed to delete project')
};

export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'Delete a project';
	r.description =
		'Permanently deletes a project and all related data (test cases, runs, results, etc.)';
	return r;
};

export default new Endpoint({ Param, Output, Error, Modifier }).handle(async (input, evt) => {
	const userId = await requireApiAuth(evt);
	try {
		// Get project with team members BEFORE deletion to avoid race condition
		const project = await db.project.findUnique({
			where: { id: input.id },
			select: {
				createdBy: true,
				teamId: true,
				team: {
					select: {
						members: {
							select: { id: true }
						}
					}
				}
			}
		});

		if (!project) {
			throw Error[404];
		}

		// Check if user has permission to delete (creator or team member)
		const user = await db.user.findUnique({ where: { id: userId }, select: { teamId: true } });
		const hasAccess =
			project.createdBy === userId || (user?.teamId && project.teamId === user.teamId);

		if (!hasAccess) {
			throw error(403, 'You do not have permission to delete this project');
		}

		// Build cache invalidation list BEFORE deletion
		const cachesToInvalidate = [CacheKeys.project(input.id), CacheKeys.projects(project.createdBy)];

		// Add team members' caches if project has a team
		if (project.team?.members) {
			project.team.members.forEach((member) => {
				cachesToInvalidate.push(CacheKeys.projects(member.id));
			});
		}

		// Perform deletion
		await db.project.delete({
			where: { id: input.id }
		});

		// Invalidate caches after deletion
		await deleteCache(cachesToInvalidate);

		return { success: true };
	} catch (err: any) {
		if (err.code === 'P2025') {
			throw Error[404];
		}
		throw Error[500];
	}
});
