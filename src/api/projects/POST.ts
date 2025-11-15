import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';
import { deleteCache, CacheKeys } from '$lib/server/redis';
import { generateProjectId } from '$lib/server/ids';

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
		const userId = await requireApiAuth(evt);

		// Get user with team and team members info BEFORE project creation
		const user = await db.user.findUnique({
			where: { id: userId },
			select: {
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

		const { name, description, key } = input;

		// Create project with retry on ID collision
		const MAX_RETRIES = 3;
		let attempts = 0;

		while (attempts < MAX_RETRIES) {
			try {
				const project = await db.project.create({
					data: {
						id: generateProjectId(),
						name,
						description: description || null,
						key: key.toUpperCase(),
						createdBy: userId,
						teamId: user?.teamId || null
					}
				});

				// Build cache invalidation list
				const cachesToInvalidate = [CacheKeys.projects(userId)];

				// Add team members' caches if user has a team
				if (user?.team?.members) {
					user.team.members.forEach((member) => {
						cachesToInvalidate.push(CacheKeys.projects(member.id));
					});
				}

				// Invalidate all affected caches
				await deleteCache(cachesToInvalidate);

				return serializeDates(project);
			} catch (err: any) {
				// P2002: Unique constraint violation
				if (err.code === 'P2002') {
					// Check which field caused the violation
					if (err.meta?.target?.includes('key')) {
						throw Error[409];
					}
					// ID collision (extremely rare with nanoid, but handle it)
					if (err.meta?.target?.includes('id')) {
						attempts++;
						if (attempts >= MAX_RETRIES) {
							console.error(
								`Project ID collision after ${MAX_RETRIES} attempts - this is extremely rare`
							);
							throw Error[500];
						}
						console.warn(`Project ID collision detected - retrying (attempt ${attempts + 1})`);
						continue; // Retry with new ID
					}
				}
				throw Error[500];
			}
		}

		// This should never be reached, but TypeScript needs it
		throw Error[500];
	}
);
