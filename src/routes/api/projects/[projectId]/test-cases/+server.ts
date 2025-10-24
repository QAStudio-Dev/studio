import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/test-cases - List test cases for project
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const suiteId = url.searchParams.get('suiteId');
		const priority = url.searchParams.get('priority');
		const type = url.searchParams.get('type');
		const automationStatus = url.searchParams.get('automationStatus');
		const tags = url.searchParams.get('tags');

		const where: any = { projectId: params.projectId };

		if (suiteId) where.suiteId = suiteId;
		if (priority) where.priority = priority;
		if (type) where.type = type;
		if (automationStatus) where.automationStatus = automationStatus;
		if (tags) {
			where.tags = {
				hasSome: tags.split(',')
			};
		}

		const testCases = await db.testCase.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				suite: {
					select: {
						id: true,
						name: true
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
		return json(testCases);
	} catch (error) {
		console.error('Error fetching test cases:', error);
		return json({ error: 'Failed to fetch test cases' }, { status: 500 });
	}
};

// POST /api/projects/[projectId]/test-cases - Create test case
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const {
			title,
			description,
			preconditions,
			steps,
			expectedResult,
			priority,
			type,
			automationStatus,
			tags,
			suiteId
		} = data;

		if (!title) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		const testCase = await db.testCase.create({
			data: {
				title,
				description,
				preconditions,
				steps,
				expectedResult,
				priority: priority || 'MEDIUM',
				type: type || 'FUNCTIONAL',
				automationStatus: automationStatus || 'NOT_AUTOMATED',
				tags: tags || [],
				projectId: params.projectId,
				suiteId: suiteId || null
			}
		});

		return json(testCase, { status: 201 });
	} catch (error: any) {
		console.error('Error creating test case:', error);
		if (error.code === 'P2003') {
			return json({ error: 'Project or suite not found' }, { status: 404 });
		}
		return json({ error: 'Failed to create test case' }, { status: 500 });
	}
};
