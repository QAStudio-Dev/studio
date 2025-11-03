import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

// PATCH /api/test-cases/[testCaseId] - Update a test case
export const PATCH: RequestHandler = async (event) => {
	const userId = requireAuth(event);
	const { params, request } = event;

	try {
		const body = await request.json();
		const {
			title,
			description,
			preconditions,
			steps,
			expectedResult,
			priority,
			type,
			automationStatus
		} = body;

		// Validate required fields
		if (!title?.trim()) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		// Check if test case exists and user has access
		const existingTestCase = await db.testCase.findUnique({
			where: { id: params.testCaseId },
			include: {
				project: {
					select: {
						id: true,
						createdBy: true
					}
				}
			}
		});

		if (!existingTestCase) {
			return json({ error: 'Test case not found' }, { status: 404 });
		}

		// Update test case
		const updatedTestCase = await db.testCase.update({
			where: { id: params.testCaseId },
			data: {
				title: title.trim(),
				description: description?.trim() || null,
				preconditions: preconditions?.trim() || null,
				steps: steps?.trim() || null,
				expectedResult: expectedResult?.trim() || null,
				priority: priority || 'MEDIUM',
				type: type || 'FUNCTIONAL',
				automationStatus: automationStatus || 'NOT_AUTOMATED',
				updatedAt: new Date()
			},
			include: {
				project: {
					select: {
						id: true,
						name: true,
						key: true
					}
				},
				suite: {
					select: {
						id: true,
						name: true
					}
				},
				creator: {
					select: {
						firstName: true,
						lastName: true,
						email: true,
						imageUrl: true
					}
				}
			}
		});

		return json(updatedTestCase);
	} catch (error) {
		console.error('Error updating test case:', error);
		return json({ error: 'Failed to update test case' }, { status: 500 });
	}
};
