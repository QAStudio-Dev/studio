import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/milestones/[id] - Get single milestone
export const GET: RequestHandler = async ({ params }) => {
	try {
		const milestone = await db.milestone.findFirst({
			where: {
				id: params.id,
				projectId: params.projectId
			},
			include: {
				_count: {
					select: { testRuns: true }
				},
				testRuns: {
					orderBy: { createdAt: 'desc' },
					take: 10
				}
			}
		});

		if (!milestone) {
			return json({ error: 'Milestone not found' }, { status: 404 });
		}

		return json(milestone);
	} catch (error) {
		console.error('Error fetching milestone:', error);
		return json({ error: 'Failed to fetch milestone' }, { status: 500 });
	}
};

// PATCH /api/projects/[projectId]/milestones/[id] - Update milestone
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description, dueDate, status } = data;

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
		if (status !== undefined) updateData.status = status;

		const milestone = await db.milestone.update({
			where: { id: params.id },
			data: updateData
		});

		return json(milestone);
	} catch (error: any) {
		console.error('Error updating milestone:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Milestone not found' }, { status: 404 });
		}
		return json({ error: 'Failed to update milestone' }, { status: 500 });
	}
};

// DELETE /api/projects/[projectId]/milestones/[id] - Delete milestone
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await db.milestone.delete({
			where: { id: params.id }
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting milestone:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Milestone not found' }, { status: 404 });
		}
		return json({ error: 'Failed to delete milestone' }, { status: 500 });
	}
};
