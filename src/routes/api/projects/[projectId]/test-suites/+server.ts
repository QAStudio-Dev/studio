import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/test-suites - List test suites for project
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const parentId = url.searchParams.get('parentId');

		const where: any = { projectId: params.projectId };

		// If parentId is provided, filter by it. If 'null', get root level suites
		if (parentId === 'null') {
			where.parentId = null;
		} else if (parentId) {
			where.parentId = parentId;
		}

		const testSuites = await db.testSuite.findMany({
			where,
			orderBy: { name: 'asc' },
			include: {
				_count: {
					select: {
						testCases: true,
						children: true
					}
				},
				children: {
					select: {
						id: true,
						name: true,
						_count: {
							select: {
								testCases: true
							}
						}
					}
				}
			}
		});
		return json(testSuites);
	} catch (error) {
		console.error('Error fetching test suites:', error);
		return json({ error: 'Failed to fetch test suites' }, { status: 500 });
	}
};

// POST /api/projects/[projectId]/test-suites - Create test suite
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description, parentId } = data;

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const testSuite = await db.testSuite.create({
			data: {
				name,
				description,
				projectId: params.projectId,
				parentId: parentId || null
			}
		});

		return json(testSuite, { status: 201 });
	} catch (error: any) {
		console.error('Error creating test suite:', error);
		if (error.code === 'P2003') {
			return json({ error: 'Project or parent suite not found' }, { status: 404 });
		}
		return json({ error: 'Failed to create test suite' }, { status: 500 });
	}
};
