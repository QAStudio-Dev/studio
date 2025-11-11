import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { serializeDates } from '$lib/utils/date';
import { deleteCache, CacheKeys } from '$lib/server/redis';

export const Param = z.object({
	id: z.string()
});

export const Input = z.object({
	name: z.string().min(1).optional(),
	description: z.string().nullable().optional(),
	key: z
		.string()
		.min(3)
		.max(10)
		.regex(/^[A-Z0-9]+$/)
		.optional()
});

export const Output = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	key: z.string(),
	createdBy: z.string(),
	teamId: z.string().nullable(),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string()
});

export const Error = {
	404: error(404, 'Project not found'),
	409: error(409, 'Project key already exists'),
	500: error(500, 'Failed to update project')
};

export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'Update a project';
	r.description = 'Updates project details. Only provided fields will be updated.';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		const updateData: any = {};
		if (input.name !== undefined) updateData.name = input.name;
		if (input.description !== undefined) updateData.description = input.description;
		if (input.key !== undefined) updateData.key = input.key.toUpperCase();

		try {
			// Get project with team members BEFORE mutation to avoid race condition
			const existingProject = await db.project.findUnique({
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

			if (!existingProject) {
				throw Error[404];
			}

			// Build cache invalidation list BEFORE mutation
			const cachesToInvalidate = [
				CacheKeys.project(input.id),
				CacheKeys.projects(existingProject.createdBy)
			];

			// Add team members' caches if project has a team
			if (existingProject.team?.members) {
				existingProject.team.members.forEach((member) => {
					cachesToInvalidate.push(CacheKeys.projects(member.id));
				});
			}

			// Perform mutation
			const project = await db.project.update({
				where: { id: input.id },
				data: updateData
			});

			// Invalidate caches after mutation
			await deleteCache(cachesToInvalidate);

			return serializeDates(project);
		} catch (err: any) {
			if (err.code === 'P2025') {
				throw Error[404];
			}
			if (err.code === 'P2002') {
				throw Error[409];
			}
			throw Error[500];
		}
	}
);
