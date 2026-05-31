import { Endpoint, z } from 'sveltekit-api';
import { requireApiAuth } from '$lib/server/api-auth';
import { getAccessibleProjectsForApi } from '$lib/server/projects';

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
	const userId = await requireApiAuth(evt);

	return getAccessibleProjectsForApi(userId);
});
