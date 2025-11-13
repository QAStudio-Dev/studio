import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string().describe('Project ID'),
	id: z.string().describe('Test case ID')
});

export const Output = z.object({
	id: z.string().describe('Test case ID'),
	title: z.string().describe('Test case title'),
	description: z.string().nullable().describe('Test case description'),
	preconditions: z.string().nullable().describe('Setup requirements'),
	steps: z.any().nullable().describe('Array of test steps'),
	expectedResult: z.string().nullable().describe('Expected test result'),
	priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).describe('Test case priority'),
	type: z
		.enum([
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
		.describe('Test case type'),
	automationStatus: z
		.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE'])
		.describe('Automation status'),
	tags: z.array(z.string()).describe('Test case tags'),
	projectId: z.string().describe('Project ID'),
	suiteId: z.string().nullable().describe('Test suite ID'),
	createdBy: z.string().describe('User ID who created the test case'),
	order: z.number().describe('Display order'),
	createdAt: z.coerce.string().describe('ISO 8601 creation timestamp'),
	updatedAt: z.coerce.string().describe('ISO 8601 last update timestamp'),
	suite: z
		.object({
			id: z.string(),
			name: z.string()
		})
		.nullable()
		.describe('Associated test suite'),
	attachments: z
		.array(
			z.object({
				id: z.string(),
				filename: z.string(),
				originalName: z.string(),
				mimeType: z.string(),
				size: z.number(),
				url: z.string(),
				createdAt: z.coerce.string()
			})
		)
		.describe('Test case attachments'),
	results: z
		.array(
			z.object({
				id: z.string(),
				status: z.enum(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST', 'UNTESTED']),
				executedAt: z.coerce.string(),
				testRun: z.object({
					id: z.string(),
					name: z.string(),
					environment: z
						.object({
							name: z.string()
						})
						.nullable()
				})
			})
		)
		.describe('Recent test results (last 10)'),
	_count: z
		.object({
			results: z.number(),
			attachments: z.number()
		})
		.describe('Count of related records')
});

export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'Get test case details';
	r.description =
		'Retrieve detailed information for a specific test case including recent results, attachments, and associated metadata.';
	return r;
};

/**
 * GET /api/projects/[projectId]/cases/[id]
 * Get detailed test case with results and attachments
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

		const testCase = await db.testCase.findFirst({
			where: {
				id,
				projectId
			},
			include: {
				suite: {
					select: {
						id: true,
						name: true
					}
				},
				attachments: {
					orderBy: { createdAt: 'desc' }
				},
				results: {
					orderBy: { executedAt: 'desc' },
					take: 10,
					include: {
						testRun: {
							select: {
								id: true,
								name: true,
								environment: {
									select: {
										name: true
									}
								}
							}
						}
					}
				},
				_count: {
					select: {
						results: true,
						attachments: true
					}
				}
			}
		});

		if (!testCase) {
			throw error(404, 'Test case not found');
		}

		return serializeDates(testCase);
	}
);
