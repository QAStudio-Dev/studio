import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string().describe('Project ID'),
	id: z.string().describe('Test run ID')
});

export const Output = z.object({
	id: z.string().describe('Test run ID'),
	name: z.string().describe('Test run name'),
	description: z.string().nullable().describe('Test run description'),
	projectId: z.string().describe('Project ID'),
	milestoneId: z.string().nullable().describe('Milestone ID'),
	environmentId: z.string().nullable().describe('Environment ID'),
	status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED']).describe('Test run status'),
	createdBy: z.string().describe('User ID who created the run'),
	startedAt: z.coerce.string().nullable().describe('ISO 8601 start timestamp'),
	completedAt: z.coerce.string().nullable().describe('ISO 8601 completion timestamp'),
	createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
	updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp'),
	milestone: z
		.object({
			id: z.string(),
			name: z.string()
		})
		.nullable()
		.describe('Associated milestone'),
	environment: z
		.object({
			id: z.string(),
			name: z.string()
		})
		.nullable()
		.describe('Associated environment'),
	results: z
		.array(
			z.object({
				id: z.string().describe('Test result ID'),
				testCaseId: z.string().describe('Test case ID'),
				status: z
					.enum(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST', 'UNTESTED'])
					.describe('Result status'),
				executedAt: z.coerce.string().describe('ISO 8601 execution timestamp'),
				testCase: z
					.object({
						id: z.string(),
						title: z.string(),
						priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
						type: z.enum([
							'FUNCTIONAL',
							'REGRESSION',
							'SMOKE',
							'INTEGRATION',
							'PERFORMANCE',
							'SECURITY',
							'UI',
							'API',
							'UNIT',
							'E2E'
						])
					})
					.describe('Associated test case'),
				_count: z
					.object({
						attachments: z.number(),
						steps: z.number()
					})
					.describe('Count of related records')
			})
		)
		.describe('Test results for this run'),
	stats: z
		.object({
			total: z.number().describe('Total number of test results'),
			passed: z.number().describe('Number of passed tests'),
			failed: z.number().describe('Number of failed tests'),
			blocked: z.number().describe('Number of blocked tests'),
			skipped: z.number().describe('Number of skipped tests'),
			retest: z.number().describe('Number of tests marked for retest'),
			untested: z.number().describe('Number of untested tests')
		})
		.describe('Statistics for test results'),
	_count: z
		.object({
			results: z.number()
		})
		.describe('Count of test results')
});

export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'Get test run details';
	r.description =
		'Retrieve detailed information for a specific test run including results, statistics, and associated metadata.';
	return r;
};

/**
 * GET /api/projects/[projectId]/runs/[id]
 * Get detailed test run with results and statistics
 */
export default new Endpoint({ Param, Output, Modifier }).handle(
	async (input, event): Promise<any> => {
		const userId = await requireApiAuth(event);
		const { projectId, id } = input;

		// Verify project access
		const project = await db.project.findUnique({
			where: { id: projectId },
			include: { team: true }
		});

		if (!project) {
			throw error(404, 'Project not found');
		}

		// Get user with team info
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		// Check access
		const hasAccess =
			project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

		if (!hasAccess) {
			throw error(403, 'You do not have access to this project');
		}

		const testRun = await db.testRun.findFirst({
			where: {
				id,
				projectId
			},
			include: {
				milestone: {
					select: {
						id: true,
						name: true
					}
				},
				environment: {
					select: {
						id: true,
						name: true
					}
				},
				results: {
					include: {
						testCase: {
							select: {
								id: true,
								title: true,
								priority: true,
								type: true
							}
						},
						_count: {
							select: {
								attachments: true,
								steps: true
							}
						}
					},
					orderBy: { executedAt: 'desc' }
				},
				_count: {
					select: {
						results: true
					}
				}
			}
		});

		if (!testRun) {
			throw error(404, 'Test run not found');
		}

		// Calculate statistics
		const stats = {
			total: testRun.results.length,
			passed: testRun.results.filter((r) => r.status === 'PASSED').length,
			failed: testRun.results.filter((r) => r.status === 'FAILED').length,
			blocked: testRun.results.filter((r) => r.status === 'BLOCKED').length,
			skipped: testRun.results.filter((r) => r.status === 'SKIPPED').length,
			retest: testRun.results.filter((r) => r.status === 'RETEST').length,
			untested: testRun.results.filter((r) => r.status === 'UNTESTED').length
		};

		return serializeDates({ ...testRun, stats });
	}
);
