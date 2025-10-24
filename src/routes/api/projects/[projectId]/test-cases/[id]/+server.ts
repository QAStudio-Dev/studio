import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/test-cases/[id] - Get single test case
export const GET: RequestHandler = async ({ params }) => {
	try {
		const testCase = await db.testCase.findFirst({
			where: {
				id: params.id,
				projectId: params.projectId
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
			return json({ error: 'Test case not found' }, { status: 404 });
		}

		return json(testCase);
	} catch (error) {
		console.error('Error fetching test case:', error);
		return json({ error: 'Failed to fetch test case' }, { status: 500 });
	}
};

// PATCH /api/projects/[projectId]/test-cases/[id] - Update test case
export const PATCH: RequestHandler = async ({ params, request }) => {
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

		const updateData: any = {};
		if (title !== undefined) updateData.title = title;
		if (description !== undefined) updateData.description = description;
		if (preconditions !== undefined) updateData.preconditions = preconditions;
		if (steps !== undefined) updateData.steps = steps;
		if (expectedResult !== undefined) updateData.expectedResult = expectedResult;
		if (priority !== undefined) updateData.priority = priority;
		if (type !== undefined) updateData.type = type;
		if (automationStatus !== undefined) updateData.automationStatus = automationStatus;
		if (tags !== undefined) updateData.tags = tags;
		if (suiteId !== undefined) updateData.suiteId = suiteId;

		const testCase = await db.testCase.update({
			where: { id: params.id },
			data: updateData
		});

		return json(testCase);
	} catch (error: any) {
		console.error('Error updating test case:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Test case not found' }, { status: 404 });
		}
		return json({ error: 'Failed to update test case' }, { status: 500 });
	}
};

// DELETE /api/projects/[projectId]/test-cases/[id] - Delete test case
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await db.testCase.delete({
			where: { id: params.id }
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting test case:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Test case not found' }, { status: 404 });
		}
		return json({ error: 'Failed to delete test case' }, { status: 500 });
	}
};
