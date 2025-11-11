import { Endpoint, z } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { serializeDates } from '$lib/utils/date';
import { getCachedOrFetch, CacheKeys, CacheTTL } from '$lib/server/redis';

// Schema definitions
const ProjectCountsSchema = z
	.object({
		testCases: z.number().describe('Number of test cases in the project'),
		testRuns: z.number().describe('Number of test runs in the project'),
		testSuites: z.number().describe('Number of test suites in the project')
	})
	.describe('Aggregate counts for project resources');

export const Output = z.array(
	z.object({
		id: z.string().describe('Unique project identifier'),
		name: z.string().describe('Project name'),
		description: z.string().nullable().describe('Project description'),
		key: z.string().describe('Unique project key (e.g., PROJ)'),
		createdBy: z.string().describe('User ID who created the project'),
		teamId: z.string().nullable().describe('Team ID if project belongs to a team'),
		createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
		updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp'),
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

	// Use cache-aside pattern
	return getCachedOrFetch(
		CacheKeys.projects(userId),
		async () => {
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
		},
		CacheTTL.project
	);
});
