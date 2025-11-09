import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { serializeDates } from '$lib/utils/date';

// Schema definitions
const ProjectCountsSchema = z.object({
	testCases: z.number(),
	testRuns: z.number(),
	testSuites: z.number()
});

export const Output = z.array(
	z.object({
		id: z.string(),
		name: z.string(),
		description: z.string().nullable(),
		key: z.string(),
		createdBy: z.string(),
		teamId: z.string().nullable(),
		createdAt: z.coerce.string(),
		updatedAt: z.coerce.string(),
		_count: ProjectCountsSchema
	})
);

export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'List all projects';
	r.description =
		'Returns all projects the authenticated user has access to (projects they created or belong to their team)';
	return r;
};

export default new Endpoint({ Output, Modifier }).handle(async (input, evt): Promise<any> => {
	const userId = await requireAuth(evt);

	// Get user with team info to determine access
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	// Build the where clause for projects
	const whereClause: any = {
		OR: [{ createdBy: userId }]
	};

	// Add team projects if user has a team
	if (user?.teamId) {
		whereClause.OR.push({ teamId: user.teamId });
	}

	// Get projects the user has access to
	const projects = await db.project.findMany({
		where: whereClause,
		orderBy: { createdAt: 'desc' },
		include: {
			_count: {
				select: {
					testCases: true,
					testRuns: true,
					testSuites: true
				}
			}
		}
	});

	return serializeDates(projects);
});
