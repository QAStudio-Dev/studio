import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/test-runs - List test runs for project
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const milestoneId = url.searchParams.get('milestoneId');
		const environmentId = url.searchParams.get('environmentId');
		const status = url.searchParams.get('status');

		const where: any = { projectId: params.projectId };
		if (milestoneId) where.milestoneId = milestoneId;
		if (environmentId) where.environmentId = environmentId;
		if (status) where.status = status;

		const testRuns = await db.testRun.findMany({
			where,
			orderBy: { createdAt: 'desc' },
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
		});
		return json(testRuns);
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
