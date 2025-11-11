import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { deleteCache, CacheKeys, deleteCachePattern } from '$lib/server/redis';

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
		await db.project.delete({
			where: { id: input.id }
		});

		// Invalidate project cache and all user caches
		await deleteCache(CacheKeys.project(input.id));
		await deleteCachePattern('projects:user:*');

		return { success: true };
	} catch (err: any) {
		if (err.code === 'P2025') {
			throw Error[404];
		}
		throw Error[500];
	}
});
