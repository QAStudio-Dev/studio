import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { deleteCache, CacheKeys } from '$lib/server/redis';

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

export default new Endpoint({ Param, Output, Error, Modifier }).handle(async (input) => {
	try {
		// Get project to determine which user caches to invalidate
		const project = await db.project.findUnique({
			where: { id: input.id },
			select: { createdBy: true, teamId: true }
		});

		if (!project) {
			throw Error[404];
		}

		await db.project.delete({
			where: { id: input.id }
		});

		// Invalidate project cache and creator's project list
		const cachesToInvalidate = [CacheKeys.project(input.id), CacheKeys.projects(project.createdBy)];

		// If project has a team, invalidate caches for all team members
		if (project.teamId) {
			const teamMembers = await db.user.findMany({
				where: { teamId: project.teamId },
				select: { id: true }
			});
			teamMembers.forEach((member) => {
				cachesToInvalidate.push(CacheKeys.projects(member.id));
			});
		}

		await deleteCache(cachesToInvalidate);

		return { success: true };
	} catch (err: any) {
		if (err.code === 'P2025') {
			throw Error[404];
		}
		throw Error[500];
	}
});
