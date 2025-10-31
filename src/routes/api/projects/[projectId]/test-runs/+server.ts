import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { generateTestRunId } from '$lib/server/ids';

// GET /api/projects/[projectId]/test-runs - List test runs for project
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const milestoneId = url.searchParams.get('milestoneId');
		const environmentId = url.searchParams.get('environmentId');
		const status = url.searchParams.get('status');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const skip = (page - 1) * limit;

		const where: any = { projectId: params.projectId };
		if (milestoneId) where.milestoneId = milestoneId;
		if (environmentId) where.environmentId = environmentId;
		if (status) where.status = status;

		const [testRuns, total] = await Promise.all([
			db.testRun.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit,
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
					_count: {
						select: {
							results: true
						}
					}
				}
			}),
			db.testRun.count({ where })
		]);

		return json({
			data: testRuns,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
				hasMore: skip + testRuns.length < total
			}
		});
	} catch (error) {
		console.error('Error fetching test runs:', error);
		return json({ error: 'Failed to fetch test runs' }, { status: 500 });
	}
};

// POST /api/projects/[projectId]/test-runs - Create test run
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description, milestoneId, environmentId, status } = data;

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const testRun = await db.testRun.create({
			data: {
				id: generateTestRunId(),
				name,
				description,
				projectId: params.projectId,
				milestoneId: milestoneId || null,
				environmentId: environmentId || null,
				status: status || 'PLANNED'
			}
		});

		return json(testRun, { status: 201 });
	} catch (error: any) {
		console.error('Error creating test run:', error);
		if (error.code === 'P2003') {
			return json({ error: 'Project, milestone, or environment not found' }, { status: 404 });
		}
		return json({ error: 'Failed to create test run' }, { status: 500 });
	}
};
