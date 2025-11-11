import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { serializeDates } from '$lib/utils/date';
import { deleteCache, CacheKeys } from '$lib/server/redis';

export const Input = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	key: z
		.string()
		.min(3)
		.max(10)
		.regex(/^[A-Z0-9]+$/)
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
	400: error(400, 'Name and key are required'),
	409: error(409, 'Project key already exists'),
	500: error(500, 'Failed to create project')
};

export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'Create a new project';
	r.description =
		'Creates a new project. The project key must be unique and will be automatically converted to uppercase.';
	return r;
};

export default new Endpoint({ Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const userId = await requireAuth(evt);

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		});

		const { name, description, key } = input;

		try {
			const project = await db.project.create({
				data: {
					name,
					description: description || null,
					key: key.toUpperCase(),
					createdBy: userId,
					teamId: user?.teamId || null
				}
			});

			// Invalidate user's projects cache
			await deleteCache(CacheKeys.projects(userId));

			return serializeDates(project);
		} catch (err: any) {
			if (err.code === 'P2002') {
				throw Error[409];
			}
			throw Error[500];
		}
	}
);
