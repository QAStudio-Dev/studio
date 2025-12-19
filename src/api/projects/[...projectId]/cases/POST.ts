import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { generateTestCaseId } from '$lib/server/ids';
import { serializeDates } from '$lib/utils/date';

export const Param = z.object({
	projectId: z.string()
});

export const Input = z.object({
	title: z.string().min(1).describe('Test case title'),
	description: z.string().optional().describe('Detailed test case description'),
	preconditions: z.string().optional().describe('Pre-requisites before executing the test'),
	steps: z.string().optional().describe('Test execution steps'),
	expectedResult: z.string().optional().describe('Expected test outcome'),
	priority: z
		.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
		.optional()
		.describe('Test case priority'),
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
		.optional()
		.describe('Test type'),
	automationStatus: z
		.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE'])
		.optional()
		.describe('Automation status'),
	tags: z.array(z.string()).optional().describe('Tags for categorization'),
	suiteId: z.string().optional().describe('Parent test suite ID')
});

export const Output = z.object({
	testCase: z.object({
		id: z.string(),
		title: z.string(),
		description: z.string().nullable(),
		preconditions: z.string().nullable(),
		steps: z.string().nullable(),
		expectedResult: z.string().nullable(),
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
		]),
		automationStatus: z.enum(['AUTOMATED', 'NOT_AUTOMATED', 'CANDIDATE']),
		tags: z.array(z.string()),
		projectId: z.string(),
		suiteId: z.string().nullable(),
		createdBy: z.string(),
		createdAt: z.coerce.string(),
		updatedAt: z.coerce.string(),
		creator: z.object({
			id: z.string(),
			email: z.string(),
			firstName: z.string().nullable(),
			lastName: z.string().nullable()
		})
	})
});

export const Error = {
	400: error(400, 'Test case title is required'),
	403: error(403, 'You do not have access to this project'),
	404: error(404, 'Project not found')
};

export const Modifier = (r: any) => {
	r.tags = ['Cases'];
	r.summary = 'Create a test case';
	r.description =
		'Create a new test case with steps, expected results, and metadata. Optionally assign to a test suite.';
	return r;
};

export default new Endpoint({ Param, Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const userId = await requireApiAuth(evt);

		// Verify project exists and user has access
		const project = await db.project.findUnique({
			where: { id: input.projectId }
		});

		if (!project) {
			throw Error[404];
		}

		const user = await db.user.findUnique({
			where: { id: userId }
		});

		const hasAccess =
			project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

		if (!hasAccess) {
			throw Error[403];
		}

		// If suiteId is provided, verify it exists and belongs to this project
		if (input.suiteId) {
			const suite = await db.testSuite.findUnique({
				where: { id: input.suiteId }
			});

			if (!suite || suite.projectId !== input.projectId) {
				throw error(400, 'Invalid test suite');
			}
		}

		// Create the test case
		const testCase = await db.testCase.create({
			data: {
				id: generateTestCaseId(),
				title: input.title,
				description: input.description,
				preconditions: input.preconditions,
				steps: input.steps,
				expectedResult: input.expectedResult,
				priority: input.priority || 'MEDIUM',
				type: input.type || 'FUNCTIONAL',
				automationStatus: input.automationStatus || 'NOT_AUTOMATED',
				tags: input.tags || [],
				projectId: input.projectId,
				suiteId: input.suiteId,
				createdBy: userId
			},
			include: {
				creator: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true
					}
				}
			}
		});

		return { testCase: serializeDates(testCase) };
	}
);
