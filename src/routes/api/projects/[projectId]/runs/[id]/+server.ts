import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/test-runs/[id] - Get single test run with detailed results
export const GET: RequestHandler = async ({ params }) => {
	try {
		const testRun = await db.testRun.findFirst({
			where: {
				id: params.id,
				projectId: params.projectId
			},
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
				results: {
					include: {
						testCase: {
							select: {
								id: true,
								title: true,
								priority: true,
								type: true
							}
						},
						_count: {
							select: {
								attachments: true,
								steps: true
							}
						}
					},
					orderBy: { executedAt: 'desc' }
				},
				_count: {
					select: {
						results: true
					}
				}
			}
		});

		if (!testRun) {
			return json({ error: 'Test run not found' }, { status: 404 });
		}

		// Calculate statistics
		const stats = {
			total: testRun.results.length,
			passed: testRun.results.filter((r) => r.status === 'PASSED').length,
			failed: testRun.results.filter((r) => r.status === 'FAILED').length,
			blocked: testRun.results.filter((r) => r.status === 'BLOCKED').length,
			skipped: testRun.results.filter((r) => r.status === 'SKIPPED').length,
			retest: testRun.results.filter((r) => r.status === 'RETEST').length,
			untested: testRun.results.filter((r) => r.status === 'UNTESTED').length
		};

		return json({ ...testRun, stats });
	} catch (error) {
		console.error('Error fetching test run:', error);
		return json({ error: 'Failed to fetch test run' }, { status: 500 });
	}
};

// PATCH /api/projects/[projectId]/test-runs/[id] - Update test run
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description, milestoneId, environmentId, status, startedAt, completedAt } = data;

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (milestoneId !== undefined) updateData.milestoneId = milestoneId;
		if (environmentId !== undefined) updateData.environmentId = environmentId;
		if (status !== undefined) {
			updateData.status = status;
			// Auto-update timestamps based on status
			if (status === 'IN_PROGRESS' && !startedAt) {
				updateData.startedAt = new Date();
			}
			if (status === 'COMPLETED' && !completedAt) {
				updateData.completedAt = new Date();
			}
		}
		if (startedAt !== undefined) updateData.startedAt = startedAt ? new Date(startedAt) : null;
		if (completedAt !== undefined)
			updateData.completedAt = completedAt ? new Date(completedAt) : null;

		const testRun = await db.testRun.update({
			where: { id: params.id },
			data: updateData
		});

		return json(testRun);
	} catch (error: any) {
		console.error('Error updating test run:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Test run not found' }, { status: 404 });
		}
		return json({ error: 'Failed to update test run' }, { status: 500 });
	}
};

// DELETE /api/projects/[projectId]/test-runs/[id] - Delete test run
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await db.testRun.delete({
			where: { id: params.id }
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting test run:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Test run not found' }, { status: 404 });
		}
		return json({ error: 'Failed to delete test run' }, { status: 500 });
	}
};
