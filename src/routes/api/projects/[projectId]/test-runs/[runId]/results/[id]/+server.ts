import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/test-runs/[runId]/results/[id] - Get single test result
export const GET: RequestHandler = async ({ params }) => {
	try {
		const result = await db.testResult.findFirst({
			where: {
				id: params.id,
				testRunId: params.runId
			},
			include: {
				testCase: {
					include: {
						suite: {
							select: {
								id: true,
								name: true
							}
						}
					}
				},
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
				},
				steps: {
					orderBy: { stepNumber: 'asc' }
				},
				attachments: {
					orderBy: { createdAt: 'desc' }
				}
			}
		});

		if (!result) {
			return json({ error: 'Test result not found' }, { status: 404 });
		}

		return json(result);
	} catch (error) {
		console.error('Error fetching test result:', error);
		return json({ error: 'Failed to fetch test result' }, { status: 500 });
	}
};

// PATCH /api/projects/[projectId]/test-runs/[runId]/results/[id] - Update test result
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { status, comment, duration, stackTrace, errorMessage } = data;

		const updateData: any = {};
		if (status !== undefined) updateData.status = status;
		if (comment !== undefined) updateData.comment = comment;
		if (duration !== undefined) updateData.duration = duration;
		if (stackTrace !== undefined) updateData.stackTrace = stackTrace;
		if (errorMessage !== undefined) updateData.errorMessage = errorMessage;

		const result = await db.testResult.update({
			where: { id: params.id },
			data: updateData
		});

		return json(result);
	} catch (error: any) {
		console.error('Error updating test result:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Test result not found' }, { status: 404 });
		}
		return json({ error: 'Failed to update test result' }, { status: 500 });
	}
};

// DELETE /api/projects/[projectId]/test-runs/[runId]/results/[id] - Delete test result
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await db.testResult.delete({
			where: { id: params.id }
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting test result:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Test result not found' }, { status: 404 });
		}
		return json({ error: 'Failed to delete test result' }, { status: 500 });
	}
};
