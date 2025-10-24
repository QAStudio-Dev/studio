import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/test-suites/[id] - Get single test suite
export const GET: RequestHandler = async ({ params }) => {
	try {
		const testSuite = await db.testSuite.findFirst({
			where: {
				id: params.id,
				projectId: params.projectId
			},
			include: {
				parent: {
					select: {
						id: true,
						name: true
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
				},
				testCases: {
					orderBy: { createdAt: 'desc' },
					include: {
						_count: {
							select: {
								results: true
							}
						}
					}
				},
				_count: {
					select: {
						testCases: true,
						children: true
					}
				}
			}
		});

		if (!testSuite) {
			return json({ error: 'Test suite not found' }, { status: 404 });
		}

		return json(testSuite);
	} catch (error) {
		console.error('Error fetching test suite:', error);
		return json({ error: 'Failed to fetch test suite' }, { status: 500 });
	}
};

// PATCH /api/projects/[projectId]/test-suites/[id] - Update test suite
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description, parentId } = data;

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (parentId !== undefined) updateData.parentId = parentId;

		const testSuite = await db.testSuite.update({
			where: { id: params.id },
			data: updateData
		});

		return json(testSuite);
	} catch (error: any) {
		console.error('Error updating test suite:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Test suite not found' }, { status: 404 });
		}
		return json({ error: 'Failed to update test suite' }, { status: 500 });
	}
};

// DELETE /api/projects/[projectId]/test-suites/[id] - Delete test suite
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await db.testSuite.delete({
			where: { id: params.id }
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting test suite:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Test suite not found' }, { status: 404 });
		}
		return json({ error: 'Failed to delete test suite' }, { status: 500 });
	}
};
